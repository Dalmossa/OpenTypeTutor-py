export interface LessonDTO {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: 'GUIDED' | 'REINFORCEMENT' | 'FREE';
  type: 'INTRODUCTION' | 'PRACTICE' | 'REINFORCEMENT' | 'ASSESSMENT';
  layout: string;
  pedagogicalPhase: string | null;
  lessonInPhase: number | null;
}