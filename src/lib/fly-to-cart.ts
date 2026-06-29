/**
 * "Fly to cart" micro-interaction: a clone of the whole item card shrinks and
 * flies into the cart icon in the topbar (id="cart-icon"), then the cart icon
 * gives a little bump. Pure DOM so it works from any click handler.
 */

const CART_ID = "cart-icon";

export function bumpCart() {
  if (typeof document === "undefined") return;
  const cart = document.getElementById(CART_ID);
  if (!cart) return;
  cart.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.35)" },
      { transform: "scale(1)" },
    ],
    { duration: 320, easing: "cubic-bezier(.34,1.56,.64,1)" },
  );
}

/** Clone `card`, then shrink + fly the clone into the cart icon. */
export function flyCardToCart(card: HTMLElement | null) {
  if (typeof document === "undefined") return;
  const cart = document.getElementById(CART_ID);
  if (!card || !cart) {
    bumpCart();
    return;
  }

  // Respect reduced-motion.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    bumpCart();
    return;
  }

  const r = card.getBoundingClientRect();
  const t = cart.getBoundingClientRect();
  const dx = t.left + t.width / 2 - (r.left + r.width / 2);
  const dy = t.top + t.height / 2 - (r.top + r.height / 2);

  const clone = card.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    "position:fixed",
    `left:${r.left}px`,
    `top:${r.top}px`,
    `width:${r.width}px`,
    `height:${r.height}px`,
    "margin:0",
    "box-sizing:border-box",
    "z-index:80",
    "pointer-events:none",
    "overflow:hidden",
    "border-radius:16px",
    "box-shadow:0 18px 40px rgba(0,0,0,.28)",
    "transition:transform .6s cubic-bezier(.5,-0.15,.35,1),opacity .6s ease-in",
    "transform-origin:center center",
    "will-change:transform,opacity",
  ].join(";");
  document.body.appendChild(clone);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clone.remove();
    bumpCart();
  };

  // Next frame: shrink toward the cart and fade out near the end.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
      clone.style.opacity = "0.15";
    });
  });
  clone.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, 750); // fallback if transitionend doesn't fire
}
