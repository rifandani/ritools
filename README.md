# heynbord

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/rifandani/heynbord)

[![Mintlify Docs](https://img.shields.io/badge/mintlify-docs-green?logo=mintlify)](https://rifandani-heynbord.mintlify.app)

## 📝 Environment Variables

For first timer, you need to create the 2 environments in your github repo. First is `dev` environment, and second is `prod` environment (that's why in `.github/workflows/ci.yml` we stated `environment: dev`). In both environments, name it `WEB_ENV_FILE` (that's why in `.github/workflows/ci.yml` we stated `secrets.WEB_ENV_FILE`).

The value for `WEB_ENV_FILE` in `dev` environment is the content of `apps/web/.env.local`, and the value for `WEB_ENV_FILE` in `prod` environment is the content of `apps/web/.env.prod`. CI writes the secret to `apps/web/.env.local`. If the secret is empty, CI copies `apps/web/.env.example` to `apps/web/.env.local`.

Source of truth is local env files. When changing them, update deployment/CI project env too.

<!-- For first timer, you need to create 2 environments in your github repo.
Go to your Github repo -> `Settings` tabs -> `Environments` -> `New environment` -> `dev` and `prod` (that's why in `.github/workflows/ci.yml` we stated `environment: dev` and `environment: prod`).

To push our local env variables to the github repo, run:

```bash
# that's why in `.github/workflows/ci.yml` we stated `secrets.WEB_ENV_FILE`
gh secret set WEB_ENV_FILE -e dev < ./apps/web/.env.local
gh secret set WEB_ENV_FILE -e prod < ./apps/web/.env.prod
```

Source of truth is local env files. When changing them, update deployment/CI project env too. -->

## 🗒️ Notes

- We have adjusted `/tdd` skills from original Matt Pocock's

## 📱 Apps

- [@workspace/web](./apps/web/README.md)

## 📦 Packages

- [@workspace/typescript-config](./packages/typescript-config/README.md)

## 📚 References

### Accessibility

- [Learn Accessibility](https://web.dev/learn/accessibility/welcome)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22)

### Performance

- [Capo.js](https://rviscomi.github.io/capo.js/) enhancing the performance of HTML `<head>` by reordering it.
- [Unlighthouse](https://unlighthouse.dev/) measuring the performance of all pages.
- [Web.dev Performance](https://web.dev/learn/performance/welcome)
- [Web Vitals](https://web.dev/explore/learn-core-web-vitals)

### PWA

- [Learn PWA](https://web.dev/learn/pwa/welcome)
- [PWA Checklist](https://web.dev/articles/pwa-checklist)
- [What PWA Can Do Today](https://whatpwacando.today/)

### Security

- [DAST (OWASP ZAP)](./docs/security/dast.md) |
- [web.dev](https://web.dev/learn/privacy/welcome)

### SEO

- [Zhead](https://zhead.dev/) is a `<head>` database. Discover new tags to use to improve your SEO, accessibility and performance.
- [Opengraph Image Playground](https://og-playground.vercel.app/).
- [JSON-LD Playground](https://json-ld.org/playground/).
- [Rich Results Test](https://search.google.com/test/rich-results) for Google or [schema.org Validator](https://validator.schema.org/) for general structured data validation.
