# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: ✂️
      - heading "BarberShop" [level=1] [ref=e7]
      - paragraph [ref=e8]: Produits & Accessoires professionnels
    - generic [ref=e9]:
      - heading "Connexion" [level=2] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "votre@email.com" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]: Mot de passe
          - textbox "••••••••" [ref=e17]
        - button "Se connecter" [ref=e18] [cursor=pointer]
      - paragraph [ref=e19]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e20] [cursor=pointer]:
          - /url: /register
```