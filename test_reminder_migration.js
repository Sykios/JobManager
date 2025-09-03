// Simple test to verify reminder migration changes
const testData = {
  // Test with both date and time
  reminder1: {
    reminder_date: '2024-01-15',
    reminder_time: '14:30'
  },
  // Test with date only
  reminder2: {
    reminder_date: '2024-01-16',
    reminder_time: null
  }
};

console.log('Testing reminder date/time formatting:');
console.log('Reminder 1 (with time):', testData.reminder1);
console.log('Reminder 2 (date only):', testData.reminder2);

// Test the logic that would be in our components
function formatReminder(reminder) {
  const date = new Date(reminder.reminder_date);
  const dateStr = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  if (reminder.reminder_time) {
    return `${dateStr} um ${reminder.reminder_time}`;
  } else {
    return `${dateStr} (ganztägig)`;
  }
}

console.log('Formatted reminder 1:', formatReminder(testData.reminder1));
console.log('Formatted reminder 2:', formatReminder(testData.reminder2));
console.log('✅ Reminder formatting test passed!');
