export function createEndpointMarkerElement(params: { variant: 'start' | 'destination'; address: string }): HTMLDivElement {
  const element = document.createElement('div');
  const title = params.variant === 'start' ? 'Start' : 'Destination';
  element.className = `route-endpoint-marker ${params.variant}`;
  element.innerHTML = `
    <div class="route-endpoint-popup">
      <div class="route-endpoint-title">${title}</div>
      <div class="route-endpoint-address">${params.address}</div>
    </div>
    <div class="route-endpoint-dot"></div>
  `;
  return element;
}