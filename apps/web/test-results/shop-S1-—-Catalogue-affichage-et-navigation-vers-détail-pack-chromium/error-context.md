# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "✂️ BarberShop" [ref=e5] [cursor=pointer]:
          - /url: /packs
          - generic [ref=e6]: ✂️
          - generic [ref=e7]: BarberShop
        - navigation [ref=e8]:
          - link "Catalogue" [ref=e9] [cursor=pointer]:
            - /url: /packs
        - generic [ref=e10]:
          - link "Panier" [ref=e11] [cursor=pointer]:
            - /url: /panier
            - generic [ref=e12]: 🛒
          - link "Connexion" [ref=e13] [cursor=pointer]:
            - /url: /login
    - main [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - heading "Nos Packs" [level=1] [ref=e17]
          - paragraph [ref=e18]: Des packs professionnels conçus pour les coiffeurs de la zone UEMOA
        - generic [ref=e19]:
          - button "Tous" [ref=e20] [cursor=pointer]
          - button "Rasage" [ref=e21] [cursor=pointer]
          - button "Capillaire" [ref=e22] [cursor=pointer]
          - button "Barbe" [ref=e23] [cursor=pointer]
    - contentinfo [ref=e115]: © 2025 BarberShop — Produits & Accessoires professionnels
  - alert [ref=e116]
```