import re

file_path = "src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace Plus New Set with a Link
old_new_set = """<button 
                onClick={() => setIsAddRulesetModalOpen(true)}
                className="text-ca-ink-muted hover:text-ca-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >"""

new_new_set = """<button 
                onClick={() => {
                  const name = prompt("Enter new rule set name:");
                  if (name) {
                    handleAddRuleset({ name });
                  }
                }}
                className="text-ca-ink-muted hover:text-ca-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >"""

content = content.replace(old_new_set, new_new_set)

# Replace Add Rule button in empty state
old_add_empty = """<button
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="px-4 py-2 bg-[#1a1c23] hover:bg-[#22252a] border border-[#333] text-ca-ink text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center gap-2"
                >"""

new_add_empty = """<button
                  onClick={() => { window.location.href = `/projects/${project.id}/rulesets/${activeRuleset.id}/add-rule`; }}
                  className="px-4 py-2 bg-[#1a1c23] hover:bg-[#22252a] border border-[#333] text-ca-ink text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center gap-2"
                >"""

content = content.replace(old_add_empty, new_add_empty)

# Replace Add Rule button at bottom
old_add_bottom = """<button
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="mt-2 w-full py-2 bg-transparent border border-dashed border-[#444] hover:border-ca-primary hover:text-ca-primary text-ca-ink-muted text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2"
                >"""

new_add_bottom = """<button
                  onClick={() => { window.location.href = `/projects/${project.id}/rulesets/${activeRuleset.id}/add-rule`; }}
                  className="mt-2 w-full py-2 bg-transparent border border-dashed border-[#444] hover:border-ca-primary hover:text-ca-primary text-ca-ink-muted text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2"
                >"""

content = content.replace(old_add_bottom, new_add_bottom)

# Replace Tuning button
old_tune = """<button onClick={(e) => { e.stopPropagation(); setVisualTunerRuleId(r.id); }} className="p-1 hover:text-ca-primary text-ca-ink-muted transition-colors" title="Edit Rule">"""
new_tune = """<button onClick={(e) => { e.stopPropagation(); window.location.href = `/projects/${project.id}/rulesets/${activeRuleset.id}/tune/${r.id}`; }} className="p-1 hover:text-ca-primary text-ca-ink-muted transition-colors" title="Edit Rule">"""
content = content.replace(old_tune, new_tune)

# Now remove the modals from the JSX so they don't even render.
old_modals = """      {/* Modals remain the same */}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCaptureCamera}
        />
      )}
      {ruleToTune && (
        <VisualToolTuningModal
          isOpen={Boolean(ruleToTune)}
          onClose={() => setVisualTunerRuleId(null)}
          rule={ruleToTune}
          imageRef={
            ruleset.imageRef && (ruleset.imageRef.startsWith("data:") || ruleset.imageRef.startsWith("blob:"))
              ? ruleset.imageRef
              : undefined
          }
          onApplyRule={(updatedRule) => {
            const nextRules = rules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
            commit(nextRules, "visual-tune");
            setVisualTunerRuleId(null);
            toast.success(`Visual tuning applied to ${updatedRule.name}!`);
          }}
        />
      )}
      {isAddRuleModalOpen && (
        <AddRuleFromToolModal
          isOpen={isAddRuleModalOpen}
          onClose={() => setIsAddRuleModalOpen(false)}
          onAddRule={(newRule, overrideImageRef) => {
            handleAddRuleFromTool(newRule, overrideImageRef);
            setVisualTunerRuleId(newRule.id);
          }}
          existingRules={rules}
        />
      )}
      <AddRulesetModal
        isOpen={isAddRulesetModalOpen}
        onClose={() => setIsAddRulesetModalOpen(false)}
        onAdd={handleAddRuleset}
      />"""

content = content.replace(old_modals, """      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCaptureCamera}
        />
      )}""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
