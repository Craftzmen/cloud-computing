export type GuideStep = "account" | "deploy" | "opened" | "quality" | "billing";

export type GuideState = {
  dismissed: boolean;
  manual: Partial<Record<GuideStep, boolean>>;
};

const GUIDE_KEY = "minipaas-guide";
export const WELCOME_KEY = "minipaas-welcome-seen";

export function loadGuide(): GuideState {
  if (typeof window === "undefined") return { dismissed: false, manual: {} };
  try {
    const raw = localStorage.getItem(GUIDE_KEY);
    if (!raw) return { dismissed: false, manual: {} };
    return JSON.parse(raw) as GuideState;
  } catch {
    return { dismissed: false, manual: {} };
  }
}

export function saveGuide(state: GuideState) {
  localStorage.setItem(GUIDE_KEY, JSON.stringify(state));
}

export function markGuideStep(step: GuideStep) {
  const state = loadGuide();
  state.manual[step] = true;
  saveGuide(state);
}

export function dismissGuide() {
  const state = loadGuide();
  state.dismissed = true;
  saveGuide(state);
}

export function resetGuide() {
  localStorage.removeItem(GUIDE_KEY);
  localStorage.removeItem(WELCOME_KEY);
}

export function markWelcomeSeen() {
  localStorage.setItem(WELCOME_KEY, "1");
}

export function welcomeSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_KEY) === "1";
}