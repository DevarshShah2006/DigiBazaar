import { acceptOrder, rejectOrder } from "../../api/orders";

const badgeColors = {
  pending: "#facc15",
  accepted: "#3b82f6",
  preparing: "#fb923c",
  ready: "#8b5cf6",
  completed: "#22c55e",
  rejected: "#ef4444",
};

function OrderCard({ order, refreshOrders }) {
  async function handleAccept() {
    await acceptOrder(order.id);
    refreshOrders();
  }

  async function handleReject() {
    await rejectOrder(order.id);
    refreshOrders();
  }

  return (
    <div className="order-card">
      <h3>Order #{order.id}</h3>

      <p>
        <strong>Customer:</strong> {order.user_name}
      </p>

      <p>
        <strong>Shop:</strong> {order.shop_name}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        <span
            style={{
            backgroundColor: badgeColors[order.status] || "#6b7280",
            color: "white",
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
            }}
        >
            {order.status}
        </span>
      </p>

      <p>
        <strong>Placed:</strong>{" "}
        {new Date(order.created_at).toLocaleString()}
      </p>

      {order.status === "pending" && (
        <>
          <button onClick={handleAccept}>
            Accept
          </button>

          <button onClick={handleReject}>
            Reject
          </button>
        </>
      )}
    </div>
  );
}

export default OrderCard;