/* ===== EDIT THE OFFER PRICE HERE (applies to all 4 landing pages) =====
   Pages ship with $79 baked in; change OFFER.price and every price on every page updates. */
window.OFFER = { price: "$79" };
(function(){var p=window.OFFER.price;document.querySelectorAll('[data-offer="price"]').forEach(function(n){if(n.textContent!==p)n.textContent=p;});})();
