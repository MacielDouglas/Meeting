<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Padrão obrigatório: shell server + Suspense + ilha client mínima

1. Páginas em `src/app/**/page.tsx` são sempre Server Components (`async`, sem
   `"use client"`). Elas fazem auth (`getCurrentUser`/`redirect`), buscam dados
   com `Promise.all` e renderizam header + dados imediatamente.
2. Interatividade (`useState`, `useEffect`, `onClick`/`onChange`/`onSubmit`,
   `useSearchParams`, `usePathname`, fetch client-side) vive SOMENTE em ilhas
   `"use client"` pequenas em `src/shared/components/*-client.tsx` ou
   `src/features/*/presentation/*-client.tsx`, recebendo só props serializáveis.
3. Todo conteúdo assíncrono pesado é envolvido em `<Suspense fallback={...}>`
   por aba/seção, com skeletons em `src/shared/components/skeletons.tsx` e
   `loading.tsx` por rota. Nunca bloquear o shell (header/nav) esperando dados.
4. Segurança: `getCurrentUser`/`require*User`, Drizzle, `better-auth` e Server
   Actions (`"use server"`) nunca vazam para o client. Do client, chamar apenas
   queries/actions `"use server"` já autorizadas; passar do server só
   `canManage`/`isOwner`/`currentUserId`, nunca o objeto `user` completo.
5. Zero supressão de lint (`biome-ignore`, `eslint-disable`): corrigir a causa
   raiz. Keys de lista usam ids estáveis por item (nunca índice do `.map`);
   estado derivado usa ajuste durante o render ou `useMemo` (nunca `setState`
   em `useEffect`); fetch client-side usa TanStack Query (`useQuery`), nunca
   fetch em `useEffect`; código morto é deletado, não comentado.
