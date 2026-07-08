import { useEffect, useState } from "react";
import { getOrders } from "../../api/orders";
import OrderCard from "../../components/OrderCard/OrderCard";

function ShopDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      setError("Failed to load orders.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return <p>Loading orders...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1>Shop Dashboard</h1>

      {orders.length === 0 ? (
        <p>No incoming orders.</p>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            refreshOrders={loadOrders}
          />
        ))
      )}
    </div>
  );
}

export default ShopDashboard;