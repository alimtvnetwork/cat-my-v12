import { dispatchMenuCommand, requestAppFullscreen, openHelpDocs } from "./TopMenuUtils";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";

export const ACTION_HANDLERS: Record<string, () => void> = {
  "edit.undo": () => dispatchMenuCommand("edit.undo"),
  "edit.redo": () => dispatchMenuCommand("edit.redo"),
  "edit.cut": () => dispatchMenuCommand("edit.cut"),
  "edit.copy": () => dispatchMenuCommand("edit.copy"),
  "edit.paste": () => dispatchMenuCommand("edit.paste"),
  "edit.delete": () => dispatchMenuCommand("edit.delete"),
  "view.zoomIn": () => dispatchMenuCommand("view.zoomIn"),
  "view.zoomOut": () => dispatchMenuCommand("view.zoomOut"),
  "view.fit": () => dispatchMenuCommand("view.fit"),
  "view.resetZoom": () => dispatchMenuCommand("view.resetZoom"),
  "view.toggleStatusBar": () => useUiPrefsStore.getState().toggleStatusBar(),
  "view.toggleDensity": () => useUiPrefsStore.getState().toggleHeaderDensity(),
  "view.toggleSidebar": () => dispatchMenuCommand("view.toggleSidebar"),
  "view.fullscreen": () => requestAppFullscreen(),
  "help.shortcuts": () => dispatchMenuCommand("help.shortcuts"),
  "help.docs": () => openHelpDocs(),
  "help.about": () => dispatchMenuCommand("help.about"),
};
