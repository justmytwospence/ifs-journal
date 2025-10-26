import { create } from 'zustand'

interface AnalysisState {
  isAnalyzing: boolean
  analysisType: 'incremental' | 'batch' | null
  setAnalyzing: (isAnalyzing: boolean, type?: 'incremental' | 'batch') => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  isAnalyzing: false,
  analysisType: null,
  setAnalyzing: (isAnalyzing, type = null) => 
    set({ isAnalyzing, analysisType: isAnalyzing ? type : null }),
}))
