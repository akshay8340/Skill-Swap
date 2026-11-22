// Free/Paid label only. The app never handles money.
export default function PriceTag({ paid, price }) {
  return paid ? (
    <span className="tag paid">Paid{price ? ` · ${price}` : ''}</span>
  ) : (
    <span className="tag free">Free</span>
  );
}
