const FROM_INPUT_IDS = ['fromInput', 'fromInputMob'] as const;
const TO_INPUT_IDS = ['toInput', 'toInputMob'] as const;

function blurInputById(id: string) {
  const element = document.getElementById(id);
  if (element instanceof HTMLElement) {
    element.blur();
  }
}

export function blurRouteLocationInput(target: 'start' | 'destination') {
  const ids = target === 'start' ? FROM_INPUT_IDS : TO_INPUT_IDS;
  for (const id of ids) {
    blurInputById(id);
  }
}

export function blurAllRouteLocationInputs() {
  for (const id of FROM_INPUT_IDS) {
    blurInputById(id);
  }

  for (const id of TO_INPUT_IDS) {
    blurInputById(id);
  }
}
