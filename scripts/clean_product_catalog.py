from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable, Optional

import pandas as pd

BIGBASKET_DATASET_ID = "surajjha101/bigbasket-entire-product-list-28k-datapoints"
FLIPKART_DATASET_ID = "aaditshukla/flipkart-fasion-products-dataset"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "dataset" / "cleaned_products.csv"


def normalize_column_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def find_column(frame: pd.DataFrame, candidates: Iterable[str]) -> Optional[str]:
    columns = {normalize_column_name(column): column for column in frame.columns}
    for candidate in candidates:
        candidate_key = normalize_column_name(candidate)
        for normalized, original in columns.items():
            if candidate_key == normalized or candidate_key in normalized or normalized in candidate_key:
                return original
    return None


def clean_text(value) -> str:
    if pd.isna(value):
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def clean_category(value) -> str:
    text = clean_text(value)
    if not text:
        return "Miscellaneous"
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"\s+", " ", text)
    return text.title()


def clean_price(value) -> float:
    if pd.isna(value):
        return 0.0
    text = str(value)
    text = re.sub(r"[^0-9.]+", "", text)
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def clean_url(value) -> str:
    text = clean_text(value)
    if text.startswith("//"):
        return f"https:{text}"
    return text


def load_local_or_kaggle_csv(raw_path: Optional[str], dataset_id: str, preferred_terms: list[str]) -> pd.DataFrame:
    if raw_path:
        path = Path(raw_path)
        if not path.exists():
            raise FileNotFoundError(f"Input CSV not found: {path}")
        return pd.read_csv(path)

    try:
        import kagglehub
    except ImportError as exc:
        raise RuntimeError(
            "kagglehub is not installed. Install the project requirements or pass --bigbasket-file/--flipkart-file."
        ) from exc

    downloaded_path = Path(kagglehub.dataset_download(dataset_id))
    csv_files = sorted(downloaded_path.rglob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in downloaded dataset folder: {downloaded_path}")

    lowered_terms = [term.lower() for term in preferred_terms]
    for csv_file in csv_files:
        lowered_name = csv_file.name.lower()
        if all(term in lowered_name for term in lowered_terms):
            return pd.read_csv(csv_file)

    return pd.read_csv(csv_files[0])


def normalize_frame(frame: pd.DataFrame, source_name: str) -> pd.DataFrame:
    name_column = find_column(frame, ["name", "product", "product_name", "title", "item_name"])
    category_column = find_column(frame, ["category", "main_category", "sub_category", "sub-category", "type"])
    brand_column = find_column(frame, ["brand", "manufacturer", "label", "seller"])
    price_column = find_column(frame, ["price", "sale_price", "selling_price", "discounted_price", "mrp", "market_price"])
    image_column = find_column(frame, ["image_url", "image", "img", "image_link", "product_image"])

    if name_column is None:
        raise ValueError(f"Could not infer a product name column for {source_name}.")

    cleaned_rows = []
    for _, row in frame.iterrows():
        name = clean_text(row.get(name_column))
        if not name:
            continue

        category = clean_category(row.get(category_column)) if category_column else source_name
        brand = clean_text(row.get(brand_column)) if brand_column else ""
        price = clean_price(row.get(price_column)) if price_column else 0.0
        image_url = clean_url(row.get(image_column)) if image_column else ""

        cleaned_rows.append(
            {
                "name": name,
                "category": category,
                "brand": brand,
                "price": price,
                "image_url": image_url,
            }
        )

    return pd.DataFrame(cleaned_rows)


def build_clean_catalog(bigbasket_file: Optional[str], flipkart_file: Optional[str], output_file: Path) -> Path:
    bigbasket_frame = load_local_or_kaggle_csv(bigbasket_file, BIGBASKET_DATASET_ID, ["bigbasket"])
    flipkart_frame = load_local_or_kaggle_csv(flipkart_file, FLIPKART_DATASET_ID, ["flipkart"])

    normalized_frames = [
        normalize_frame(bigbasket_frame, "BigBasket"),
        normalize_frame(flipkart_frame, "Fashion"),
    ]

    merged = pd.concat(normalized_frames, ignore_index=True)
    merged = merged.drop_duplicates(subset=["name", "category", "brand", "price", "image_url"]) 
    merged = merged.sort_values(["category", "name"]).reset_index(drop=True)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(output_file, index=False)
    return output_file


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean BigBasket + Flipkart fashion CSVs into a unified product catalog.")
    parser.add_argument("--bigbasket-file", default=None, help="Path to the raw BigBasket CSV file.")
    parser.add_argument("--flipkart-file", default=None, help="Path to the raw Flipkart CSV file.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Where to write the cleaned CSV.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    output_path = build_clean_catalog(args.bigbasket_file, args.flipkart_file, Path(args.output))
    print(f"Wrote cleaned catalog to {output_path}")
