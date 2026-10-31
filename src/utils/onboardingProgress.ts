export const onboardingTasks = [
  {
    id: 'company',
    title: 'Firmendaten vervollständigen',
    detail: 'Speichere Firmenname, Adresse und E-Mail.',
    path: '/einstellungen',
    action: 'Firmendaten öffnen',
  },
  {
    id: 'booking',
    title: 'Erste Buchung erfassen',
    detail: 'Erfasse eine Einnahme oder Ausgabe.',
    path: '/buchungen',
    action: 'Buchungen öffnen',
  },
  {
    id: 'document',
    title: 'Dokumenten-Upload testen',
    detail: 'Lade einen Beleg hoch und lass ihn prüfen.',
    path: '/dokumente',
    action: 'Dokumente öffnen',
  },
  {
    id: 'kitty',
    title: 'Kitty eine Frage stellen',
    detail: 'Stelle eine Frage und warte auf Kittys Antwort.',
    action: 'Kitty öffnen',
  },
] as const;

export type OnboardingTaskId = (typeof onboardingTasks)[number]['id'];

export const ONBOARDING_PROGRESS_EVENT = 'bookitty:onboarding-progress';

const storageKey = (scope: string) => `bookitty.onboarding.progress.${encodeURIComponent(scope)}`;

export const getOnboardingScope = (userId: string | number | undefined, isDemo: boolean) =>
  isDemo ? 'demo' : userId ? `user:${userId}` : null;

export const getCompletedOnboardingTasks = (scope: string): OnboardingTaskId[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey(scope)) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return onboardingTasks
      .map((task) => task.id)
      .filter((taskId) => saved.includes(taskId));
  } catch {
    return [];
  }
};

export const isOnboardingComplete = (scope: string) =>
  onboardingTasks.every((task) => getCompletedOnboardingTasks(scope).includes(task.id));

export const completeOnboardingTask = (taskId: OnboardingTaskId, scope: string) => {
  const completed = getCompletedOnboardingTasks(scope);
  if (completed.includes(taskId)) return;

  try {
    localStorage.setItem(storageKey(scope), JSON.stringify([...completed, taskId]));
  } catch {
    // Keep the current session usable if browser storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(ONBOARDING_PROGRESS_EVENT, {
    detail: { scope, taskId },
  }));
};