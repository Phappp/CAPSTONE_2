import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// ====== Types ======
export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type DroppedNode = {
  type: 'module' | 'lesson' | 'quiz' | 'assignment';
  id: number;
  title: string;
};

export type AttachedContent = {
  type: 'file' | 'image' | 'code' | 'text';
  content: string;
  filename?: string;
  mimeType?: string;
};

export type ModuleInfo = {
  id: number;
  title: string;
  lessons: Array<{
    id: number;
    title: string;
    type: LessonType;
    completed: boolean;
  }>;
};

export type LearningContextData = {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  progressPercent: number;
  totalLessons: number;
  completedLessons: number;
  currentLessonId?: number;
  currentLessonTitle?: string;
  currentLessonType?: LessonType;
  currentModuleId?: number;
  currentModuleTitle?: string;
  modules?: ModuleInfo[];
  droppedNode?: DroppedNode;
  attachedContent?: AttachedContent;
};

type ChatbotContextValue = {
  learningContext: LearningContextData | null;
  setLearningContext: (context: LearningContextData | null) => void;
  updateLearningContext: (updates: Partial<LearningContextData>) => void;
  setDroppedNode: (node: DroppedNode | null) => void;
  setAttachedContent: (content: AttachedContent | null) => void;
  clearAll: () => void;
};

// ====== Context ======
const ChatbotContext = createContext<ChatbotContextValue | undefined>(undefined);

// ====== Provider Props ======
interface ChatbotProviderProps {
  children: ReactNode;
}

// ====== Provider Component ======
export function ChatbotProvider({ children }: ChatbotProviderProps) {
  const [learningContext, setLearningContextState] = useState<LearningContextData | null>(null);

  const setLearningContext = useCallback((context: LearningContextData | null) => {
    setLearningContextState(context);
  }, []);

  const updateLearningContext = useCallback((updates: Partial<LearningContextData>) => {
    setLearningContextState(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const setDroppedNode = useCallback((node: DroppedNode | null) => {
    setLearningContextState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        droppedNode: node || undefined,
      };
    });
  }, []);

  const setAttachedContent = useCallback((content: AttachedContent | null) => {
    setLearningContextState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        attachedContent: content || undefined,
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setLearningContextState(null);
  }, []);

  const value: ChatbotContextValue = {
    learningContext,
    setLearningContext,
    updateLearningContext,
    setDroppedNode,
    setAttachedContent,
    clearAll,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
}

// ====== Hook ======
export function useChatbotContext(): ChatbotContextValue {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider');
  }
  return context;
}

// ====== Utility Functions ======
export function createLearningContext(data: Omit<LearningContextData, 'droppedNode' | 'attachedContent'>): LearningContextData {
  return {
    ...data,
    droppedNode: undefined,
    attachedContent: undefined,
  };
}

export function createDroppedNode(
  type: DroppedNode['type'],
  id: number,
  title: string
): DroppedNode {
  return { type, id, title };
}

export function createAttachedContent(
  type: AttachedContent['type'],
  content: string,
  filename?: string,
  mimeType?: string
): AttachedContent {
  return { type, content, filename, mimeType };
}
