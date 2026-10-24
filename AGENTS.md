<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All business config (name, colors, logo, discount, min score, coupon days) lives in the single `settings` row; never hardcode per-client values, so the project can be duplicated for other businesses.
- Player/coupon writes go only through server functions in `src/lib/game.functions.ts` (one play per phone per São Paulo day, enforced by a unique index); admin reads/updates use RLS with the `has_role` admin check.
- Logo is stored as a resized data URL in `settings.logo_url` because public storage buckets are blocked in this workspace.
- URL debug testing is browser-only via `src/lib/game-test.ts`; it must bypass eligibility and submission, return non-redeemable sample coupons, and leave production daily limits intact so public URL parameters cannot mint discounts.
