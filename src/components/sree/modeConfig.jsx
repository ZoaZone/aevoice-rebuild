
import SreeView from "@/components/sree/views/SreeView.jsx";
import TextChatView from "@/components/sree/views/TextChatView.jsx";
import AgenticView from "@/components/sree/views/AgenticView.jsx";
import DeveloperSreeView from "@/components/sree/views/DeveloperSreeView.jsx";
import VoiceChatView from "@/components/sree/views/VoiceChatView.jsx";

export const modeConfig = {
  "Sree (Local Knowledge)": {
    Component: SreeView,
    header: "Sree: Local Knowledge",
    footer: null,
  },
  "Sri (Text Chat)": {
    Component: TextChatView,
    header: "Sri: Text Chat",
    footer: null,
  },
  "AI Sree (Agentic Assistant)": {
    Component: AgenticView,
    header: "AI Sree: Agentic Assistant",
    footer: null,
    props: { config: { enableHotword: true, enableOverlay: true, enableScreenContext: true, enableKB: true } },
  },
  "Developer Sree": {
    Component: DeveloperSreeView,
    header: "Developer Sree",
    footer: null,
  },
  "Voice Chat": {
    Component: VoiceChatView,
    header: "Voice Chat",
    footer: null,
    props: { config: { enableKB: true } },
  },
};

export default modeConfig;
