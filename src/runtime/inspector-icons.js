function workbenchIcon(name) {
  const paths = {
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    eyeOff: 'm3 3 18 18 M10 5c.65-.1 1.3-.15 2-.15 6.5 0 10 7.15 10 7.15a22 22 0 0 1-3 4 M6 6C3.4 8.2 2 12 2 12s3.5 7 10 7c2 0 3.7-.65 5.2-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
    lock: 'M6 10h12v11H6Z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
    unlock: 'M6 10h12v11H6Z M8 10V6a4 4 0 0 1 7.7-1.5 M12 14v3',
    text: 'M4 5h16 M12 5v15 M8 20h8',
    card: 'M3 5h18v14H3Z M6 9h7 M6 13h12',
    shape: 'm12 3 9 9-9 9-9-9Z',
    image: 'M3 4h18v16H3Z m0 12 5-5 4 4 3-3 6 6 M17 8h.01',
    table: 'M3 4h18v16H3Z M3 9h18 M3 14h18 M9 4v16 M15 4v16',
    code: 'm8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
    grip: 'M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    chevron: 'm9 5 7 7-7 7',
    arrowUp: 'm5 12 7-7 7 7 M12 5v15',
    arrowDown: 'm5 12 7 7 7-7 M12 4v15',
    reset: 'M4 10a8 8 0 1 1 1 8 M4 4v6h6',
    copy: 'M8 8h13v13H8Z M16 4V2H2v14h2',
    paste: 'M8 4H4v18h16V4h-4 M8 2h8v5H8Z',
    close: 'm6 6 12 12 M6 18 18 6',
    alignLeft: 'M4 3v18 M8 6h12 M8 12h8 M8 18h12',
    alignCenter: 'M12 3v18 M4 6h16 M7 12h10 M4 18h16',
    alignRight: 'M20 3v18 M4 6h12 M8 12h8 M4 18h12',
    alignTop: 'M3 4h18 M6 8v12 M12 8v8 M18 8v12',
    alignMiddle: 'M3 12h18 M6 4v16 M12 7v10 M18 4v16',
    alignBottom: 'M3 20h18 M6 4v12 M12 8v8 M18 4v12'
  };
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('width', '18'); icon.setAttribute('height', '18');
  icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false'); icon.classList.add('wb-icon');
  icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.7');
  icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', paths[name] || paths.shape);
  icon.append(path); return icon;
}
