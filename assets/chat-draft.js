export function draftChat(message) {
  const room = document.getElementById('breakRoom');
  const input = document.getElementById('breakRoomSend').elements.message;
  input.value = message;
  room.open = true;
  room.scrollIntoView({ block: 'start' });
  const focus = document.getElementById('breakRoomSession').hidden
    ? document.getElementById('breakRoomJoin').elements.nickname : input;
  focus.focus({ preventScroll: true });
}
