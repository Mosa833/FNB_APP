<<<<<<< HEAD
// Fixed lists used in the app. Jobs, mentors, tests and the skills list live in Supabase.

export const JOB_TYPES = [
  'Admin and office work', 'Receptionist', 'Data capturer', 'Call centre agent', 'Customer service agent',
  'Cashier', 'Retail sales assistant', 'Merchandiser', 'Shelf packer', 'Waiter', 'Barista', 'Chef assistant',
  'Kitchen assistant', 'Housekeeper', 'Cleaner', 'Security guard', 'Delivery driver', 'General driver',
  'Warehouse assistant', 'Forklift operator', 'Packer', 'Phone repair technician', 'IT support',
  'Junior software developer', 'Junior web designer', 'Graphic designer', 'Social media assistant',
  'Marketing assistant', 'Sales representative', 'Telesales agent', 'Bookkeeper', 'Accounts clerk',
  'Bank teller', 'Tutor', 'Teaching assistant', 'Childcare worker', 'Caregiver', 'Community health worker',
  'Hairdresser', 'Barber', 'Nail technician', 'Electrician assistant', 'Plumber assistant', 'Welder',
  'Carpenter', 'Painter', 'General worker', 'Gardener', 'Farm worker', 'Learnership', 'Internship',
];

export const LANGUAGE_OPTIONS = [
  'English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'Sepedi', 'Setswana', 'Sesotho', 'Xitsonga', 'siSwati',
  'Tshivenda', 'isiNdebele', 'South African Sign Language', 'Portuguese', 'French', 'Swahili', 'Shona',
  'Chichewa', 'Arabic', 'Mandarin',
];

export const QUALIFICATIONS = ['Matric (Grade 12)', 'Grade 11 or lower', 'N certificate (N1 to N6)', 'Certificate', 'Diploma', 'Degree', 'Short course', 'Learnership', 'Online course'];
export const EXPERIENCE_KINDS = ['Job', 'Self-employed', 'Informal work', 'Volunteer', 'Internship', 'Learnership'];
export const AVAILABILITY = ['Full-time', 'Part-time', 'Weekends', 'Shifts', 'Remote', 'Internships'];
export const START_OPTIONS = ['Immediately', 'In 2 weeks', 'In 1 month', 'After my studies'];
export const TRAVEL_OPTIONS = [5, 10, 20, 50];
export const LICENCES = ['None', "Learner's licence", 'Code 8 (B)', 'Code 10 (C1)', 'Code 14 (EC)'];

=======
export const SUGGESTED_SKILLS = ['Data capturing', 'Cashier', 'Canva', 'Driving', 'Tutoring'];

export const JOBS = [
  {
    id: 'j1',
    title: 'Junior Admin Assistant',
    company: 'Lerato Logistics',
    area: 'Braamfontein',
    fullArea: 'Braamfontein, Johannesburg',
    pay: 'R6 500/month',
    type: 'Full-time',
    level: 'Entry level',
    distance: '6 km',
    travel: 'Taxi about R30/day',
    travelLong: '6 km from home · about R30 a day by taxi',
    match: 92,
    filters: ['Near me'],
    needs: ['Excel', 'Customer service', 'Matric', 'Report writing'],
    gapCourse: 'Report writing',
  },
  {
    id: 'j2',
    title: 'Call Centre Agent',
    company: 'Ubuntu Connect',
    area: 'Soweto',
    fullArea: 'Soweto, Johannesburg',
    pay: 'R5 800/month',
    type: 'Full-time',
    level: 'Entry level',
    distance: '3 km',
    travel: 'Walkable',
    travelLong: '3 km from home · walkable',
    match: 85,
    filters: ['Near me'],
    needs: ['Customer service', 'Digital literacy', 'Matric', 'Phone etiquette'],
    gapCourse: 'Phone etiquette',
  },
  {
    id: 'j3',
    title: 'Social Media Helper',
    company: 'Kasi Bakes',
    area: 'Remote',
    fullArea: 'Remote',
    pay: 'R800 for a 1 week task',
    type: 'Microinternship',
    level: 'Entry level',
    distance: 'Remote',
    travel: 'No travel',
    travelLong: 'Remote work · no travel cost',
    match: 78,
    filters: ['Part-time', 'Internships'],
    needs: ['Social media', 'Canva', 'Digital literacy'],
    gapCourse: 'Canva',
  },
  {
    id: 'j4',
    title: 'Phone Repair Assistant',
    company: 'FixIt Mobile',
    area: 'Maponya Mall, Soweto',
    fullArea: 'Maponya Mall, Soweto',
    pay: 'R4 200/month',
    type: 'Part-time',
    level: 'Entry level',
    distance: '4 km',
    travel: 'Taxi about R20/day',
    travelLong: '4 km from home · about R20 a day by taxi',
    match: 74,
    filters: ['Near me', 'Part-time'],
    needs: ['Phone repair', 'Customer service', 'Cashier'],
    gapCourse: 'Cashier',
  },
];

export const MENTORS = [
  { id: 'm1', initials: 'NL', name: 'Nomsa L.', role: 'HR Manager · 8 years', rating: '4.9', about: 'Helps with CVs, first jobs and interviews.' },
  { id: 'm2', initials: 'SK', name: 'Sipho K.', role: 'Software Developer · 5 years', rating: '4.8', about: 'Helps with tech careers and learnerships.' },
];

>>>>>>> origin/main
export const GUIDES = [
  {
    title: 'How to find your first job',
    body: 'Start with what you can already do, even if it was unpaid. Add every skill to your profile and take the free tests so employers can trust your badges. Apply to jobs above 70% match first, and follow up after one week if you have not heard back.',
  },
  {
    title: 'Using informal work on your CV',
    body: 'Fixing phones, selling at a market, helping at church or tutoring a neighbour all count. Write what you did, how long you did it and one result, for example: "Repaired about 40 phones in 2023 for customers in my area."',
  },
<<<<<<< HEAD
  {
    title: 'Answering "Tell us about yourself"',
    body: 'Keep it to about one minute. Say where you are now (studying or working), one or two things you are good at with a short example, and why you want this job. Leave out personal details that do not relate to work.',
  },
=======
>>>>>>> origin/main
];

export const TIPS = [
  'Arrive 15 minutes early for interviews and bring a copy of your ID.',
  'Keep your phone on silent during interviews.',
  'Read about the company before the interview so you can ask one good question.',
<<<<<<< HEAD
  'Use a short example for every strength you mention.',
];
=======
];

// Each test: questions with one correct answer index
export const TESTS = [
  {
    id: 'digital',
    name: 'Digital literacy',
    skill: 'Digital literacy',
    minutes: 8,
    extra: null,
    questions: [
      { q: 'You receive an email asking for your bank PIN to "verify your account". What should you do?', options: ['Reply with the PIN so the account stays open', 'Delete it and report it as phishing', 'Forward it to a friend to check', 'Click the link and log in'], answer: 1 },
      { q: 'Which password is the strongest?', options: ['thabo2003', '123456789', 'Taxi!Rank7Soweto', 'password'], answer: 2 },
      { q: 'What does "Ctrl + C" do on most computers?', options: ['Closes the window', 'Copies the selected item', 'Cuts the selected item', 'Changes the font'], answer: 1 },
      { q: 'A website address starts with "https". What does the "s" tell you?', options: ['The site is a shop', 'The site is slow', 'The connection is secure', 'The site is from South Africa'], answer: 2 },
      { q: 'In a spreadsheet, what does =SUM(A1:A5) do?', options: ['Adds the numbers in A1 to A5', 'Counts the cells in A1 to A5', 'Finds the biggest number', 'Sorts the numbers'], answer: 0 },
      { q: 'You want to send a big file to an employer. What is the best option?', options: ['Print it and take a photo', 'Share a link from cloud storage', 'Send it in 10 WhatsApp messages', 'Copy it to a CD'], answer: 1 },
      { q: 'What is the safest way to use public Wi-Fi?', options: ['Do online banking freely', 'Avoid logging into sensitive accounts', 'Turn off your screen lock', 'Share your hotspot password'], answer: 1 },
      { q: 'Which email address looks the most professional for job applications?', options: ['coolboi99@email.com', 'thabo.mokoena@email.com', 'partyking@email.com', 'xx_thabo_xx@email.com'], answer: 1 },
      { q: 'A pop-up says your phone has a virus and asks you to call a number. What should you do?', options: ['Call the number right away', 'Pay to remove the virus', 'Close it and do not call', 'Give them your ID number'], answer: 2 },
      { q: 'What does "BCC" mean when sending an email?', options: ['Others cannot see who else got the email', 'The email is sent faster', 'The email is deleted after reading', 'The email is sent to your boss'], answer: 0 },
    ],
  },
  {
    id: 'customer',
    name: 'Customer service',
    skill: 'Customer service',
    minutes: 6,
    extra: null,
    questions: [
      { q: 'A customer is angry about a late delivery. What do you do first?', options: ['Argue that it is not your fault', 'Listen and say you understand', 'Put them on hold for a long time', 'Tell them to call later'], answer: 1 },
      { q: 'You do not know the answer to a customer question. What is best?', options: ['Guess an answer', 'Say you will find out and come back to them', 'Ignore the question', 'Tell them to Google it'], answer: 1 },
      { q: 'What is a good way to end a call with a customer?', options: ['Hang up once they stop talking', 'Ask if there is anything else you can help with', 'Say "bye" quickly', 'Transfer them to anyone'], answer: 1 },
      { q: 'A customer uses rude words. What should you do?', options: ['Be rude back', 'Stay calm and polite, and ask a manager if needed', 'Laugh at them', 'Leave without saying anything'], answer: 1 },
      { q: 'Why should you use the customer name during a conversation?', options: ['It makes it personal and respectful', 'It is a rule nobody follows', 'It makes the call longer', 'It is not allowed'], answer: 0 },
      { q: 'A customer wants something your shop does not sell. What is the best reply?', options: ['"We do not have it." and walk away', 'Suggest a similar item or where they could find it', 'Tell them it is a bad product', 'Pretend you did not hear'], answer: 1 },
    ],
  },
  {
    id: 'excel',
    name: 'Excel basics',
    skill: 'Excel',
    minutes: 6,
    extra: null,
    questions: [
      { q: 'Which formula finds the average of cells B2 to B10?', options: ['=AVG(B2-B10)', '=AVERAGE(B2:B10)', '=MEAN(B2:B10)', '=SUM(B2/B10)'], answer: 1 },
      { q: 'What is a cell in Excel?', options: ['A full row', 'Where a row and column meet', 'A saved file', 'A chart'], answer: 1 },
      { q: 'How do you keep the top row visible while scrolling?', options: ['Freeze panes', 'Merge cells', 'Wrap text', 'Hide row'], answer: 0 },
      { q: 'What does =COUNTIF(A:A,"Yes") do?', options: ['Adds all "Yes" values', 'Counts the cells that say "Yes"', 'Deletes "Yes" cells', 'Sorts by "Yes"'], answer: 1 },
      { q: 'Which tool lets you show only rows that match a value?', options: ['Filter', 'Format painter', 'Spell check', 'Page layout'], answer: 0 },
      { q: 'What does a $ do in =$A$1?', options: ['Shows money format', 'Keeps the cell reference fixed when copied', 'Makes the cell bold', 'Adds the numbers'], answer: 1 },
    ],
  },
  {
    id: 'phone',
    name: 'Phone repair',
    skill: 'Phone repair',
    minutes: 12,
    extra: 'Photo task',
    questions: [
      { q: 'Before opening a phone, what should you do first?', options: ['Charge it fully', 'Switch it off and remove the SIM tray', 'Pour water on it', 'Factory reset it'], answer: 1 },
      { q: 'A phone screen is black but the phone vibrates. What is the most likely problem?', options: ['Broken display or display cable', 'No airtime', 'Wrong SIM card', 'Full storage'], answer: 0 },
      { q: 'Which tool is safest for lifting a glued back cover?', options: ['A kitchen knife', 'Heat and a plastic opening pick', 'A hammer', 'A metal screwdriver forced in'], answer: 1 },
      { q: 'Why should you disconnect the battery before replacing parts?', options: ['To avoid short circuits and damage', 'To make the phone lighter', 'It is not needed', 'To reset the time'], answer: 0 },
      { q: 'A battery is swollen. What should you do?', options: ['Press it flat', 'Keep using it', 'Replace it and dispose of it safely', 'Put it in the fridge'], answer: 2 },
      { q: 'A phone will not charge. What is a quick first check?', options: ['Clean the charging port and try another cable', 'Replace the screen', 'Update the apps', 'Change the wallpaper'], answer: 0 },
      { q: 'What does ESD protection prevent?', options: ['Water damage', 'Static electricity damaging parts', 'Screen scratches', 'Viruses'], answer: 1 },
      { q: 'Before handing a phone back, what should you do?', options: ['Test calls, charging, screen and buttons with the customer', 'Hand it back without testing', 'Keep their SIM card', 'Delete their photos'], answer: 0 },
    ],
  },
];

export const INTERVIEW_QUESTIONS = {
  'Admin and office work': {
    General: ['Tell us about yourself.', 'Why do you want to work in an office?', 'What are your strengths?', 'Where do you see yourself in two years?', 'Why should we hire you?'],
    Skills: ['How do you use Excel in your work or studies?', 'How do you keep files organised?', 'How would you write a short email to a client?', 'How do you check your work for mistakes?', 'Which computer programs can you use?'],
    'Problem solving': ['Tell us about a time you helped a difficult customer.', 'You have three tasks due today. How do you decide what to do first?', 'The printer breaks before a meeting. What do you do?', 'You made a mistake in a report. What do you do?', 'Your manager is not available and a client needs an answer. What do you do?'],
  },
  'Call centre': {
    General: ['Tell us about yourself.', 'Why do you want to work in a call centre?', 'How do you handle pressure?', 'What does good service mean to you?', 'Why should we hire you?'],
    Skills: ['How do you calm down an upset caller?', 'How do you make sure you understood a customer?', 'How fast can you type, and how do you know?', 'How do you take notes during a call?', 'Which languages can you speak?'],
    'Problem solving': ['Tell us about a time you helped a difficult customer.', 'A caller asks for something against company rules. What do you do?', 'Your system goes down during a call. What do you say?', 'You get the same complaint ten times in a day. What do you do?', 'A caller keeps talking about something unrelated. How do you guide them?'],
  },
  'Retail and sales': {
    General: ['Tell us about yourself.', 'Why do you want to work in retail?', 'How do you get to work on time?', 'What would your last customer say about you?', 'Why should we hire you?'],
    Skills: ['How do you handle cash safely?', 'How would you sell a product you do not like?', 'How do you keep shelves neat during busy times?', 'How do you work out change quickly?', 'How do you greet a customer?'],
    'Problem solving': ['Tell us about a time you helped a difficult customer.', 'You see someone stealing. What do you do?', 'The till is short at the end of the day. What do you do?', 'A customer wants a refund without a slip. What do you do?', 'Two customers need help at the same time. What do you do?'],
  },
};
>>>>>>> origin/main
