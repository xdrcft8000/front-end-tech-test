import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ChatInput,
  ChatInputTextArea,
  ChatInputSubmit,
} from '@/components/ui/chat-input';
import { useAssistantChat, type Message } from '@/hooks/useAssistantChat';
import { cn } from '@/lib/utils';

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-current animate-blink align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}

export function ChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    stopStream,
    clearMessages,
  } = useAssistantChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full',
          'mesh-gradient shadow-lg shadow-purple-500/25',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/30',
          'text-white',
          isOpen && 'hidden'
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-[380px] h-[520px]',
            'flex flex-col',
            'bg-card border border-border rounded-2xl shadow-2xl',
            'animate-in slide-in-from-bottom-4 fade-in duration-200'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Assistant</span>
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isConnected ? 'bg-emerald-500' : 'bg-gray-500'
                )}
                title={isConnected ? 'Connected' : 'Disconnected'}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p>Ask me anything about your trades</p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border">
            <ChatInput
              variant="default"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={handleSubmit}
              loading={isLoading}
              onStop={stopStream}
            >
              <ChatInputTextArea
                placeholder="Ask about trades..."
                className="text-sm"
              />
              <ChatInputSubmit />
            </ChatInput>
          </div>
        </div>
      )}
    </>
  );
}
