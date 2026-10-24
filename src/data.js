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

export const GUIDES = [
  {
    title: 'How to find your first job',
    body: 'Start with what you can already do, even if it was unpaid. Add every skill to your profile and take the free tests so employers can trust your badges. Apply to jobs above 70% match first, and follow up after one week if you have not heard back.',
  },
  {
    title: 'Using informal work on your CV',
    body: 'Fixing phones, selling at a market, helping at church or tutoring a neighbour all count. Write what you did, how long you did it and one result, for example: "Repaired about 40 phones in 2023 for customers in my area."',
  },
  {
    title: 'Answering "Tell us about yourself"',
    body: 'Keep it to about one minute. Say where you are now (studying or working), one or two things you are good at with a short example, and why you want this job. Leave out personal details that do not relate to work.',
  },
];

export const TIPS = [
  'Arrive 15 minutes early for interviews and bring a copy of your ID.',
  'Keep your phone on silent during interviews.',
  'Read about the company before the interview so you can ask one good question.',
  'Use a short example for every strength you mention.',
];
