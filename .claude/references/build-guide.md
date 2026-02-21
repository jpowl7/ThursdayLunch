# How to Add a Feature

1. **Schema**: If new data is needed, add migration in `src/lib/db/migrations/`
2. **Zod**: Add/update schemas in `src/lib/schemas/`
3. **Queries**: Add SQL functions in `src/lib/db/queries.ts`
4. **API**: Add route handler in `src/app/api/`
5. **Components**: Add UI in `src/components/`
6. **Page**: Wire into page in `src/app/`
7. **Test**: `npm run type-check && npm run lint && npm run build`
