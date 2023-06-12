document.getElementById('answer-form').addEventListener('submit', function(event) {
  event.preventDefault();

  const answerInput = document.getElementById('answer');
  const answer = answerInput.value.trim().toLowerCase();

  if (answer === 'i love you') {
    document.getElementById('result').textContent = 'You know what? I love you too!';
    document.getElementById('result').classList.remove('hidden');
    answerInput.disabled = true;
  } else {
    document.getElementById('result').textContent = 'Incorrect answer. Please try again.';
    document.getElementById('result').classList.remove('hidden');
  }
});
