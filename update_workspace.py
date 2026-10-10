import re

file_path = "src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's replace the returned JSX.
old_return_pattern = re.compile(r'  return \(\n      <div className="flex min-w-0 flex-1 flex-col h-full bg-\[\#111\] text-ca-ink">.*', re.DOTALL)

new_return = """  return (
    <div className="flex min-w-0 flex-1 h-full bg-[#0b0c10] text-ca-ink font-hmi overflow-hidden">
      {/* 65% Left: Image Viewport */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#22252a]">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-[#111318] border-b border-[#22252a] px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-ca-ink-muted text-[10px] font-bold uppercase tracking-widest">Tools</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRunAnalysis}
              disabled={isAnalyzing}
              className="px-6 py-2 bg-ca-primary hover:bg-ca-primary/80 text-[#0b0c10] text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={12} className={isAnalyzing ? "animate-spin" : ""} />
              {isAnalyzing ? "Running..." : "Run"}
            </button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 min-h-0 bg-[#000] relative">
          <VisualToolWorkpieceCanvas
            imageRef={ruleset.imageRef}
            rules={rules}
            toolParams={activeRule?.params}
            isEditable={false}
            isAnalyzeMode={true}
            overlayRules={projectOverlayRules}
            selectedRuleId={activeRule?.id}
            onSelectRule={handleCanvasSelectRule}
            onLaunchPatternTuner={handleLaunchPatternTuner}
            onPatternBoxesChange={handlePatternBoxesChange}
            validationStatus={activeValidationResult?.status}
            validationScore={activeValidationResult?.score}
            validationResultsMap={allValidationResults}
            onRunAnalysis={handleManualRunAnalysis}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
      
      {/* 35% Right: Rules and Image Samples */}
      <div className="w-[35%] min-w-[320px] max-w-[500px] bg-[#111318] flex flex-col shrink-0">
        
        {/* RULES SECTION */}
        <div className="flex-1 min-h-0 flex flex-col border-b border-[#22252a]">
          <div className="flex items-center justify-between p-3 border-b border-[#22252a] bg-[#0b0c10]">
            <h2 className="text-ca-ink font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} className="text-ca-primary" />
              Rules
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAddRulesetModalOpen(true)}
                className="text-ca-ink-muted hover:text-ca-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <Plus size={12} />
                New Set
              </button>
            </div>
          </div>
          
          <div className="p-3 border-b border-[#22252a]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-ca-ink-muted font-bold uppercase tracking-wider">Active Set:</span>
              <select
                value={activeRuleset.id}
                onChange={(e) => onSelectRuleset?.(e.target.value)}
                className="flex-1 bg-[#1a1c23] border border-[#22252a] text-xs font-mono p-1 rounded-sm focus:border-ca-primary focus:outline-none"
              >
                {rulesets.map(rs => (
                  <option key={rs.id} value={rs.id}>{rs.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <span className="text-ca-ink-muted text-xs font-mono mb-3">No rules in this set.</span>
                <button
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="px-4 py-2 bg-[#1a1c23] hover:bg-[#22252a] border border-[#333] text-ca-ink text-[10px] font-bold uppercase rounded-sm transition-colors flex items-center gap-2"
                >
                  <Plus size={12} />
                  Add Rule
                </button>
              </div>
            ) : (
              <>
                {rules.map((r, idx) => {
                  const isSelected = activeRule?.id === r.id;
                  const rResult = allValidationResults[r.id];
                  const isPass = rResult?.status === "pass";
                  const isFail = rResult?.status === "fail";
                  
                  return (
                    <div 
                      key={r.id}
                      onClick={() => handleCanvasSelectRule(r.id)}
                      className={`flex items-center justify-between p-2 rounded-sm border cursor-pointer transition-colors ${
                        isSelected ? "border-ca-primary bg-ca-primary/10" : "border-[#22252a] bg-[#1a1c23] hover:border-[#444]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-[10px] font-bold text-ca-ink-muted w-4 text-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold truncate ${isSelected ? "text-ca-primary" : "text-ca-ink"}`}>
                            {r.name}
                          </span>
                          <span className="text-[9px] text-ca-ink-muted uppercase tracking-wider truncate">
                            {r.params?.toolCode || r.family || "Tool"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rResult && (
                          <span className={`text-[10px] font-bold uppercase ${isPass ? "text-ca-ok" : isFail ? "text-red-500" : "text-ca-ink-muted"}`}>
                            {rResult.status}
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setVisualTunerRuleId(r.id); }} className="p-1 hover:text-ca-primary text-ca-ink-muted transition-colors" title="Edit Rule">
                          <Settings size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); railHandlers.onDelete(r.id); }} className="p-1 hover:text-red-400 text-ca-ink-muted transition-colors" title="Delete Rule">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => setIsAddRuleModalOpen(true)}
                  className="mt-2 w-full py-2 bg-transparent border border-dashed border-[#444] hover:border-ca-primary hover:text-ca-primary text-ca-ink-muted text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={12} />
                  Add Rule
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* IMAGE SAMPLES SECTION */}
        <div className="h-[40%] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-[#22252a] bg-[#0b0c10]">
            <h2 className="text-ca-ink font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Film size={14} className="text-ca-primary" />
              Image Samples
            </h2>
            <div className="flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportImage(file);
                  e.target.value = "";
                }}
              />
              <button 
                onClick={() => imageInputRef.current?.click()}
                className="text-ca-ink-muted hover:text-ca-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <Plus size={12} />
                Upload
              </button>
            </div>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {ruleset.imageRef ? (
                <div className="aspect-square bg-black border border-ca-primary rounded-sm overflow-hidden relative cursor-pointer group">
                  <img src={ruleset.imageRef} alt="Sample" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 border-2 border-ca-primary/0 group-hover:border-ca-primary/100 transition-colors pointer-events-none" />
                </div>
              ) : (
                <div className="aspect-square bg-[#1a1c23] border border-[#22252a] rounded-sm flex items-center justify-center text-ca-ink-muted text-[10px] font-mono p-2 text-center">
                  No images
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Modals remain the same */}
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
      />
    </div>
  );
}
"""

content = old_return_pattern.sub(new_return, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
