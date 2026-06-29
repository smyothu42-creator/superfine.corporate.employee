import { notFound } from "next/navigation";
import { ItemDetailView } from "@/features/menu/item-detail-view";
import { menu, getItem } from "@/data/menu";

export function generateStaticParams() {
  return menu.map((item) => ({ id: item.id }));
}

export default function ItemPage({ params }: { params: { id: string } }) {
  const item = getItem(params.id);
  if (!item) notFound();
  return <ItemDetailView item={item} />;
}
