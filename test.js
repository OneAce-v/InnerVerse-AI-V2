fetch('http://localhost:3000/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock2' },
  body: JSON.stringify({
    age: 28, gender: 'female', height: 165, weight: 60, stressLevel: 4, primaryGoal: 'Fitness', fitnessLevel: 'Intermediate', activityLevel: 'Active'
  })
}).then(res => res.json()).then(console.log).catch(console.error);
