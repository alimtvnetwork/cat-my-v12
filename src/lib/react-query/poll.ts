// Plan follow-up: pause React Query polling after an error. Per user rule:
// "if an error pops up once, do not retry the same thing over and over."
// Pass to `refetchInterval`; polling resumes after a successful refetch
// (state.error clears) or an explicit `queryClient.invalidateQueries`.
export const pausePollOnError =
  (ms: number) =>
  (query: { state: { error: unknown } }): number | false =>
    query.state.error ? false : ms;
