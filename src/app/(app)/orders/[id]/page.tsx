import { notFound } from "next/navigation";
import { OrderDetailView } from "@/features/orders/order-detail-view";
import { orders, getOrder } from "@/data/orders";

export function generateStaticParams() {
  return orders.map((o) => ({ id: o.id }));
}

export default function OrderPage({ params }: { params: { id: string } }) {
  const order = getOrder(params.id);
  if (!order) notFound();
  return <OrderDetailView order={order} />;
}
