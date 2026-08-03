import './CategoryCarousel.css'

const CATEGORY_ITEMS = [
  {
    label: 'Vegetables',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuVyuMLNOXz5amvxnCIzg1_L_LEaiZom2C_02K1VaKxGehVGzQg29mWck63LHFoo2vlV69ahRuRMGsVUweBwCs6u5p1kvxs4ZmlCqxwffnCd3evHYUjLwDfZWNEvtiBe_4Q-Axl48LQ2aROStaUa8hfKkDJDoa4k0k5uh06zyMRIqpMxCkY55y7ljdlaISHakkcsl9-Gi4LF2U3LDdjyRU_knZt_PUxpZS61YOSO_UXtLHnavUAGh7',
  },
  {
    label: 'Fruits',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbRue0tbPdmFWfbtuWC7v8j7PUF1NmWerrnTBmCRKuEH8_L_a6niAKxN-n8OhbUEcd_wRbAGeAjYeyOdiGXSFkvy40hutN1xTghzkz2JOh_ZyjLI7pZ8gP3xo6uaqRf-nL_I_anLi7c1fmhK5JF7cKAlzAk9Vy1FADJCxy0pi_BSB_z1mNvL6I-P2ZT1aIBmrJvebDmsslgrVlDqH4sKYFuK-1Q83dGmlIGoXIVba_vJMpaZAJvlcn',
  },
  {
    label: 'Dairy',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhBzYAbWPDRMtIH2OcVrLUY9jxsjiwzd2YNzMlIgjuz9qGxkZk4414ag5ZIV9i5dJ4ZPE1c6jXhXhNlo_JPB89hcrh6uH6KyyIflNdojU71r_KUXzErBNIh_rAo3Y0TD1w5OvPYKBmzGsLQaACf8bP39MDfR_WtAVcoLNhtvcL4QAnpHR1ebAkikxU-EKjAGb_VjwKUML3HJNrLoM0cFh7M2eBWA2EHXqTzq47D4uExvXiNoSwSXVG',
  },
  {
    label: 'Bakery',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvGyO39p7Ybvg9lXuJYWOOqw4Rd6atXc1UltP-jHlXqb8BWG61PluYwrbJ0B9PKCb7JD5AdmfQu3U7TvSkzIXGBtayx_ij2wqfJQGPWY5gzFY5j-ABv0JgNGesVhdWMMZTVBwl_s9w5dOx1myVO4Y99Hry4ME7S3Zhxdu5rqm1CYkDy5gqaoNOP3wblsfOEVBYSg7TNGpZoplvmL9oius9qkU0drD6mlwZgV10eRx4OAo2jyiVQ8m4',
  },
  {
    label: 'Snacks',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmQdUEe3x-DSocun3Pz41mzcItSG1tbwjcFFklY7CtB7t9ZIDMuk6aB4KaIlW5FYjkdKwKe-rj19gpTrOoP_kyNOkxuT9uCqloqRIYj3Ol6WiFZaJgztouE5wxYAwSULF0CujUPc4rjeV0xycvpYUoSH3aTPXBIcmXuWJOuKFpXPVnwTIoW6HiBX69xFkWz8d3G1DVHeUkCbfJqkCrgg7gtQ_rhoayXGbjDczbOPY4FfZh56rWTU5r',
  },
  {
    label: 'Personal Care',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFzoVOc-7rx-DbmRElbA94iNoNSrh3YCXLudDEYK_f1EU4ANMGyDfgyBh_KHjOTalIjKN_feUegH4Ynl7pcl0y-mZCDSJEwSZ0U8F_MW1UMoVV9FUTxL1CoefxclfXGcPW-87FfYjokwQllj-WdrehDxlXWRf6hxVDl3pg6dBi5Rh1vS6axOba4gc1gFrTuRqx-X6mkqOtDts4vm2FnOKnBXydHFPgyR5EfESjH0HJoMYPTNMx66TI',
  },
  {
    label: 'Baby Care',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiUxgEn4SbjsCiUpvNEmMbaSmNh-kto9ms4mh5QLosrObXohQ4b-LCKM7QkjPILciKq3sdpyo0nT5ZfiYu3EAEwex8r3OXMbjj703dYNAE6EPru7qbTzN6QfQLXwhld36eWBYTq9m5kXzS5umUy2v_r_ebtWqFEUSMWLij3uKtK98f-WEkosN0HwUMGrfqtXKoK5o_WRATuN0-i1Eaai95n4eBofxj8zELhF-3ldgHB7VvVLddXY4F',
  },
  {
    label: 'Pet Care',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyd96-lYRa3XOlPJSkYy_ot-QPsL7uMO-5i6Kg3n3hOepITlZz_5v7KjCQ-h_Ac0x9wxx2BRa4FQoHb8J6WbkAxG7Tl54lB7wPrOYZJUKaTMIu3IWTfMViPJQcvRl_c6sSOgHyiZhh3Qfg5XbYo_X58iL7-32bioZX3dedkMp9pg9zP1euKbBiQBY3HSCAM-4nSgUicIQnXaHCpzPPa-9Jb1isKpIWQ7R7g8Jocroajv1AXC2bEVSf',
  },
]

const LOCAL_FALLBACK_ICON = '/placeholder-product.svg'

function CategoryCarousel({ categories }) {
  const items = categories.length ? categories.map(cat => ({
    label: cat.name,
    image: CAT_IMAGE_MAP[cat.name.toLowerCase()] || LOCAL_FALLBACK_ICON,
  })) : CATEGORY_ITEMS

  return (
    <section className="category-carousel">
      <div className="category-carousel__track">
        {items.map((item, index) => (
          <button key={`${item.label}-${index}`} className="category-card" type="button">
            <div className="category-card__icon">
              <img
                src={item.image}
                alt={item.label}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = LOCAL_FALLBACK_ICON
                }}
              />
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

const CAT_IMAGE_MAP = {
  vegetables: CATEGORY_ITEMS[0].image,
  fruits: CATEGORY_ITEMS[1].image,
  dairy: CATEGORY_ITEMS[2].image,
  bakery: CATEGORY_ITEMS[3].image,
  snacks: CATEGORY_ITEMS[4].image,
  'personal care': CATEGORY_ITEMS[5].image,
  'baby care': CATEGORY_ITEMS[6].image,
  'pet care': CATEGORY_ITEMS[7].image,
}

export default CategoryCarousel
