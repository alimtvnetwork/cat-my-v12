export function useRuleColorMutation() {
  return {
    mutate: (ruleId: string, color: string) => {
      console.log("Mock save color", ruleId, color);
    },
  };
}
