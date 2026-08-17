import React from "react";
import { useVisionStore } from "../../lib/vision/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function HandlerSettingsForm(): React.JSX.Element | null {
  const { segments, activeSegmentId, setHandlerOutputs, setHandlerInputs } = useVisionStore();

  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const outputs = activeSegment.visionSettings.handlerSettings?.outputs || {
    ready: false,
    busy: false,
    pass: false,
    fail: false,
  };

  const inputs = activeSegment.visionSettings.handlerSettings?.inputs || {
    triggerIn: false,
    partPresent: false,
  };

  const handleOutputToggle = (key: keyof typeof outputs) => {
    setHandlerOutputs(activeSegment.visionSettings!.id, {
      [key]: !outputs[key],
    });
  };

  const handleInputToggle = (key: keyof typeof inputs) => {
    setHandlerInputs(activeSegment.visionSettings!.id, {
      [key]: !inputs[key],
    });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">PLC Output Signals</CardTitle>
        <CardDescription>
          Configure and monitor programmable logic controller output states.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Inputs
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(inputs).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center space-x-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Switch
                    id={`switch-input-${key}`}
                    checked={value}
                    onCheckedChange={() => handleInputToggle(key as keyof typeof inputs)}
                  />
                  <Label
                    htmlFor={`switch-input-${key}`}
                    className="text-sm font-medium capitalize cursor-pointer"
                  >
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Outputs
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(outputs).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center space-x-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Switch
                    id={`switch-output-${key}`}
                    checked={value}
                    onCheckedChange={() => handleOutputToggle(key as keyof typeof outputs)}
                  />
                  <Label
                    htmlFor={`switch-output-${key}`}
                    className="text-sm font-medium capitalize cursor-pointer"
                  >
                    {key}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
