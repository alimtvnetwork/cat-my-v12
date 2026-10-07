  return (
    <div className="flex min-w-0 flex-1 flex-col h-full bg-[#111] text-ca-ink">
      <div className="flex flex-col h-full w-full">
        {/* 1. Top Ribbon */}
        <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-[#333] px-4 py-2 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-ca-ink font-bold text-sm tracking-wide">
              PROJECT: {project.name}
            </span>
            <div className="h-4 w-px bg-[#333]" />
            <span className="text-ca-ink-muted text-xs">
              {projectAnalysisItems.length} RULES
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveRuleSet}
              disabled={isSaving}
              className="px-3 py-1 bg-ca-select text-white text-xs font-bold uppercase rounded disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button className="px-3 py-1 bg-[#2d2d2d] border border-[#444] text-white text-xs font-bold uppercase rounded hover:bg-[#3d3d3d] transition-colors">
              Utility
            </button>
            <button className="px-3 py-1 bg-[#2d2d2d] border border-[#444] text-white text-xs font-bold uppercase rounded hover:bg-[#3d3d3d] transition-colors">
              Run Mode
            </button>
          </div>
        </div>

        {/* 2. Horizontal rule/tool thumbnail strip */}
        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#252525] border-b border-[#333] shrink-0 min-h-[80px]">
          {/* Add Tools Tile */}
          <button
            onClick={() => setIsAddRuleModalOpen(true)}
            className="flex flex-col items-center justify-center w-20 h-16 bg-[#1a1a1a] border border-[#444] rounded hover:border-ca-select transition-colors shrink-0"
          >
            <Plus size={16} className="text-ca-ink-muted mb-1" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Add Tools</span>
          </button>
          
          {/* Set Camera Tile */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex flex-col items-center justify-center w-20 h-16 bg-[#1a1a1a] border border-[#444] rounded hover:border-cyan-400 transition-colors shrink-0"
          >
            <Camera size={16} className="text-ca-ink-muted mb-1" />
            <span className="text-[10px] text-ca-ink-muted font-bold uppercase">Set Camera</span>
          </button>

          {/* Rule Tiles */}
          {rules.map((r, idx) => {
            const isSelected = activeRule?.id === r.id;
            const rResult = allValidationResults[r.id];
            const isPass = rResult?.status === "PASS";
            const isFail = rResult?.status === "FAIL";
            
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedIds([r.id]);
                  useRulesStore.getState().setSelection([r.id], "thumbnail-strip");
                }}
                className={`flex flex-col relative items-center justify-center w-24 h-16 bg-[#1a1a1a] border rounded transition-colors shrink-0 ${isSelected ? "border-amber-400 bg-amber-400/10" : "border-[#444] hover:border-[#666]"}`}
              >
                <span className="text-[10px] text-ca-ink-muted absolute top-1 left-1">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className={`text-[10px] font-bold mt-3 truncate w-full px-1 ${isSelected ? "text-amber-400" : "text-ca-ink"}`}>
                  {r.name}
                </span>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isPass ? "bg-emerald-500" : isFail ? "bg-red-500" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>

        {/* 3 & 4. Main workspace (left canvas, right settings) */}
        <div className="flex flex-1 min-h-0 bg-[#111]">
          {/* Left: camera/current image viewport */}
          <div className="flex-1 relative p-1 overflow-hidden flex flex-col border-r border-[#333]">
             <VisualToolWorkpieceCanvas
                imageRef={ruleset.imageRef || defaultWorkpieceFilledSample}
                toolCode={
                  typeof activeRule?.params?.toolCode === "string"
                    ? activeRule.params.toolCode
                    : undefined
                }
                toolName={activeRule?.name}
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
          
          {/* Right: selected rule result/settings panel */}
          <div className="w-[320px] bg-[#1a1a1a] flex flex-col shrink-0 overflow-y-auto">
            {activeRule ? (
              <div className="flex flex-col h-full">
                {/* Rule Header */}
                <div className="p-3 border-b border-[#333] bg-[#222]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1 py-0.5 bg-amber-400 text-black text-[10px] font-bold rounded">
                      {activeRule.params?.toolCode || "TOOL"}
                    </span>
                    <span className="text-ca-ink font-bold text-sm truncate">
                      {activeRule.name}
                    </span>
                  </div>
                  <div className="text-ca-ink-muted text-[10px] uppercase">
                    {activeRule.family || "Analysis Tool"}
                  </div>
                </div>
                
                {/* Measurement Table */}
                <div className="flex-1 p-3">
                   <div className="text-xs text-ca-ink-muted mb-2 font-bold uppercase tracking-wider">Judged Result</div>
                   {activeValidationResult ? (
                     <div className="bg-[#111] border border-[#333] rounded p-2 mb-4">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-xs text-ca-ink">Status:</span>
                         <span className={`text-xs font-bold ${activeValidationResult.status === "PASS" ? "text-emerald-400" : activeValidationResult.status === "FAIL" ? "text-red-400" : "text-amber-400"}`}>
                           {activeValidationResult.status}
                         </span>
                       </div>
                       {activeValidationResult.score !== undefined && (
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs text-ca-ink">Score/Match:</span>
                           <span className="text-xs text-ca-ink font-mono">{activeValidationResult.score}</span>
                         </div>
                       )}
                       {activeValidationResult.details && Object.entries(activeValidationResult.details).map(([k, v]) => (
                         <div key={k} className="flex justify-between items-center mb-1">
                           <span className="text-xs text-ca-ink">{k}:</span>
                           <span className="text-xs text-ca-ink font-mono">{String(v)}</span>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-xs text-ca-ink-muted mb-4">No results yet. Run analysis.</div>
                   )}
                </div>
                
                {/* Bottom Edit Button */}
                <div className="p-3 border-t border-[#333] bg-[#222]">
                  <button
                    onClick={() => setVisualTunerRuleId(activeRule.id)}
                    className="w-full py-2 bg-[#333] hover:bg-[#444] border border-[#555] text-white text-xs font-bold uppercase rounded transition-colors"
                  >
                    Edit Rule Settings
                  </button>
                  <button
                    onClick={() => railHandlers.onDelete(activeRule.id)}
                    className="w-full mt-2 py-1 bg-transparent hover:bg-red-950/30 text-red-400 border border-transparent hover:border-red-900/50 text-[10px] font-bold uppercase rounded transition-colors"
                  >
                    Delete Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4 text-center">
                <span className="text-xs text-ca-ink-muted">Select a tool from the strip above to view results and settings.</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Bottom action bar */}
        <div className="flex items-center justify-end gap-3 bg-[#1e1e1e] border-t border-[#333] p-2 shrink-0">
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
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#444] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2"
          >
            <FileImage size={14} />
            Register Image
          </button>
          <button
            type="button"
            onClick={handleManualRunAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} className={isAnalyzing ? "animate-spin" : ""} />
            {isAnalyzing ? "Running..." : "Run"}
          </button>
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
    </div>
  );
}
