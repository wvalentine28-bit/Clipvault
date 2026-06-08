import { ChatInterface } from "@/components/chat/ChatInterface";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";

export default function ChatPage() {
  return (
    <div className="flex h-full gap-4 -m-6">
      <ConversationSidebar />
      <div className="flex-1 min-w-0">
        <ChatInterface />
      </div>
    </div>
  );
}
