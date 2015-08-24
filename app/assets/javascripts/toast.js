// Since we are not providing an action, this is called a toast.
function createToast(message) {
  'use strict';
  var snackbar = document.createElement('div'),
      text = document.createElement('div');
  snackbar.classList.add('mdl-snackbar');
  text.classList.add('mdl-snackbar__text');
  text.innerText = message;
  snackbar.appendChild(text);
  document.body.appendChild(snackbar);
  // Remove after 10 seconds
  setTimeout(function(){
    snackbar.remove();
  }, 10000);
}