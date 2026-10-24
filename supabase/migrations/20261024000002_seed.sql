-- SkillBridge starter data (demo jobs and mentors, real test questions)

insert into public.skills_catalog (name, category) values
  ('Digital literacy', 'Digital and IT'),
  ('Microsoft Word', 'Digital and IT'),
  ('Excel', 'Digital and IT'),
  ('PowerPoint', 'Digital and IT'),
  ('Google Workspace', 'Digital and IT'),
  ('Email writing', 'Digital and IT'),
  ('Typing', 'Digital and IT'),
  ('Data capturing', 'Digital and IT'),
  ('Data entry', 'Digital and IT'),
  ('Social media', 'Digital and IT'),
  ('Social media marketing', 'Digital and IT'),
  ('Canva', 'Digital and IT'),
  ('Graphic design', 'Digital and IT'),
  ('Photography', 'Digital and IT'),
  ('Video editing', 'Digital and IT'),
  ('Content writing', 'Digital and IT'),
  ('Copywriting', 'Digital and IT'),
  ('Web design', 'Digital and IT'),
  ('HTML and CSS', 'Digital and IT'),
  ('JavaScript', 'Digital and IT'),
  ('Python', 'Digital and IT'),
  ('SQL', 'Digital and IT'),
  ('App development', 'Digital and IT'),
  ('IT support', 'Digital and IT'),
  ('Computer repairs', 'Digital and IT'),
  ('Networking', 'Digital and IT'),
  ('Cybersecurity basics', 'Digital and IT'),
  ('Phone repair', 'Digital and IT'),
  ('Online research', 'Digital and IT'),
  ('Customer service', 'Office and business'),
  ('Phone etiquette', 'Office and business'),
  ('Reception', 'Office and business'),
  ('Filing and admin', 'Office and business'),
  ('Bookkeeping', 'Office and business'),
  ('Basic accounting', 'Office and business'),
  ('Payroll', 'Office and business'),
  ('Report writing', 'Office and business'),
  ('Stock control', 'Office and business'),
  ('Inventory management', 'Office and business'),
  ('Sales', 'Office and business'),
  ('Telesales', 'Office and business'),
  ('Marketing', 'Office and business'),
  ('Event planning', 'Office and business'),
  ('Project coordination', 'Office and business'),
  ('Scheduling', 'Office and business'),
  ('Minute taking', 'Office and business'),
  ('Cash handling', 'Office and business'),
  ('Cashier', 'Office and business'),
  ('Point of sale (POS)', 'Office and business'),
  ('Merchandising', 'Office and business'),
  ('Retail sales', 'Office and business'),
  ('Call centre', 'Office and business'),
  ('Debt collection', 'Office and business'),
  ('Electrical work', 'Trades and technical'),
  ('Plumbing', 'Trades and technical'),
  ('Welding', 'Trades and technical'),
  ('Carpentry', 'Trades and technical'),
  ('Painting', 'Trades and technical'),
  ('Bricklaying', 'Trades and technical'),
  ('Tiling', 'Trades and technical'),
  ('Motor mechanics', 'Trades and technical'),
  ('Panel beating', 'Trades and technical'),
  ('Solar panel installation', 'Trades and technical'),
  ('Air conditioning repair', 'Trades and technical'),
  ('Appliance repair', 'Trades and technical'),
  ('Sewing', 'Trades and technical'),
  ('Tailoring', 'Trades and technical'),
  ('Hairdressing', 'Trades and technical'),
  ('Barbering', 'Trades and technical'),
  ('Nail technician', 'Trades and technical'),
  ('Makeup artistry', 'Trades and technical'),
  ('Beauty therapy', 'Trades and technical'),
  ('Cooking', 'Food and hospitality'),
  ('Baking', 'Food and hospitality'),
  ('Food preparation', 'Food and hospitality'),
  ('Barista', 'Food and hospitality'),
  ('Waitering', 'Food and hospitality'),
  ('Bartending', 'Food and hospitality'),
  ('Housekeeping', 'Food and hospitality'),
  ('Cleaning', 'Food and hospitality'),
  ('Food safety and hygiene', 'Food and hospitality'),
  ('Tutoring', 'Care and education'),
  ('Teaching assistant', 'Care and education'),
  ('Childcare', 'Care and education'),
  ('Early childhood development', 'Care and education'),
  ('Elderly care', 'Care and education'),
  ('First aid', 'Care and education'),
  ('Home-based care', 'Care and education'),
  ('Community health work', 'Care and education'),
  ('Driving', 'Transport and outdoor'),
  ('Delivery driving', 'Transport and outdoor'),
  ('Forklift operation', 'Transport and outdoor'),
  ('Warehouse work', 'Transport and outdoor'),
  ('Picking and packing', 'Transport and outdoor'),
  ('Logistics coordination', 'Transport and outdoor'),
  ('Security guarding', 'Transport and outdoor'),
  ('Gardening', 'Transport and outdoor'),
  ('Landscaping', 'Transport and outdoor'),
  ('Farming', 'Transport and outdoor'),
  ('Construction labour', 'Transport and outdoor'),
  ('Health and safety', 'Transport and outdoor'),
  ('Communication', 'Work skills'),
  ('Teamwork', 'Work skills'),
  ('Problem solving', 'Work skills'),
  ('Time management', 'Work skills'),
  ('Leadership', 'Work skills'),
  ('Public speaking', 'Work skills'),
  ('Negotiation', 'Work skills'),
  ('Conflict resolution', 'Work skills'),
  ('Attention to detail', 'Work skills'),
  ('Critical thinking', 'Work skills'),
  ('Creativity', 'Work skills'),
  ('Adaptability', 'Work skills')
on conflict do nothing;

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Digital literacy', 'Digital literacy', 8, null, 10)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'You receive an email asking for your bank PIN to "verify your account". What should you do?', '["Reply with the PIN so the account stays open", "Delete it and report it as phishing", "Forward it to a friend to check", "Click the link and log in"]', 1),
  (2, 'Which password is the strongest?', '["thabo2003", "123456789", "Taxi!Rank7Soweto", "password"]', 2),
  (3, 'What does "Ctrl + C" do on most computers?', '["Closes the window", "Copies the selected item", "Cuts the selected item", "Changes the font"]', 1),
  (4, 'A website address starts with "https". What does the "s" tell you?', '["The site is a shop", "The site is slow", "The connection is secure", "The site is from South Africa"]', 2),
  (5, 'In a spreadsheet, what does =SUM(A1:A5) do?', '["Adds the numbers in A1 to A5", "Counts the cells in A1 to A5", "Finds the biggest number", "Sorts the numbers"]', 0),
  (6, 'You want to send a big file to an employer. What is the best option?', '["Print it and take a photo", "Share a link from cloud storage", "Send it in 10 WhatsApp messages", "Copy it to a CD"]', 1),
  (7, 'What is the safest way to use public Wi-Fi?', '["Do online banking freely", "Avoid logging into sensitive accounts", "Turn off your screen lock", "Share your hotspot password"]', 1),
  (8, 'Which email address looks the most professional for job applications?', '["coolboi99@email.com", "thabo.mokoena@email.com", "partyking@email.com", "xx_thabo_xx@email.com"]', 1),
  (9, 'A pop-up says your phone has a virus and asks you to call a number. What should you do?', '["Call the number right away", "Pay to remove the virus", "Close it and do not call", "Give them your ID number"]', 2),
  (10, 'What does "BCC" mean when sending an email?', '["Others cannot see who else got the email", "The email is sent faster", "The email is deleted after reading", "The email is sent to your boss"]', 0)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Customer service', 'Customer service', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'A customer is angry about a late delivery. What do you do first?', '["Argue that it is not your fault", "Listen and say you understand", "Put them on hold for a long time", "Tell them to call later"]', 1),
  (2, 'You don''t know the answer to a customer''s question. What is best?', '["Guess an answer", "Say you will find out and come back to them", "Ignore the question", "Tell them to Google it"]', 1),
  (3, 'What is a good way to end a call with a customer?', '["Hang up once they stop talking", "Ask if there is anything else you can help with", "Say \"bye\" quickly", "Transfer them to anyone"]', 1),
  (4, 'A customer uses rude words. What should you do?', '["Be rude back", "Stay calm and polite, and ask a manager if needed", "Laugh at them", "Leave without saying anything"]', 1),
  (5, 'Why should you use the customer''s name during a conversation?', '["It makes it personal and respectful", "It is a rule nobody follows", "It makes the call longer", "It is not allowed"]', 0),
  (6, 'A customer wants something your shop doesn''t sell. What is the best reply?', '["\"We don''t have it.\" and walk away", "Suggest a similar item or where they could find it", "Tell them it is a bad product", "Pretend you did not hear"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Excel', 'Excel basics', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'Which formula finds the average of cells B2 to B10?', '["=AVG(B2-B10)", "=AVERAGE(B2:B10)", "=MEAN(B2:B10)", "=SUM(B2/B10)"]', 1),
  (2, 'What is a cell in Excel?', '["A full row", "Where a row and column meet", "A saved file", "A chart"]', 1),
  (3, 'How do you keep the top row visible while scrolling?', '["Freeze panes", "Merge cells", "Wrap text", "Hide row"]', 0),
  (4, 'What does =COUNTIF(A:A,"Yes") do?', '["Adds all \"Yes\" values", "Counts the cells that say \"Yes\"", "Deletes \"Yes\" cells", "Sorts by \"Yes\""]', 1),
  (5, 'Which tool lets you show only rows that match a value?', '["Filter", "Format painter", "Spell check", "Page layout"]', 0),
  (6, 'What does a $ do in =$A$1?', '["Shows money format", "Keeps the cell reference fixed when copied", "Makes the cell bold", "Adds the numbers"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Phone repair', 'Phone repair', 12, 'Practical questions', 8)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'Before opening a phone, what should you do first?', '["Charge it fully", "Switch it off and remove the SIM tray", "Pour water on it", "Factory reset it"]', 1),
  (2, 'A phone screen is black but the phone vibrates. What is the most likely problem?', '["Broken display or display cable", "No airtime", "Wrong SIM card", "Full storage"]', 0),
  (3, 'Which tool is safest for lifting a glued back cover?', '["A kitchen knife", "Heat and a plastic opening pick", "A hammer", "A metal screwdriver forced in"]', 1),
  (4, 'Why should you disconnect the battery before replacing parts?', '["To avoid short circuits and damage", "To make the phone lighter", "It is not needed", "To reset the time"]', 0),
  (5, 'A battery is swollen. What should you do?', '["Press it flat", "Keep using it", "Replace it and dispose of it safely", "Put it in the fridge"]', 2),
  (6, 'A phone won''t charge. What is a quick first check?', '["Clean the charging port and try another cable", "Replace the screen", "Update the apps", "Change the wallpaper"]', 0),
  (7, 'What does ESD protection prevent?', '["Water damage", "Static electricity damaging parts", "Screen scratches", "Viruses"]', 1),
  (8, 'Before handing a phone back, what should you do?', '["Test calls, charging, screen and buttons with the customer", "Hand it back without testing", "Keep their SIM card", "Delete their photos"]', 0)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Cashier', 'Cashier', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'A customer pays R200 for items costing R147,50. How much change do you give?', '["R52,50", "R53,50", "R47,50", "R62,50"]', 0),
  (2, 'Your till is R50 short at the end of your shift. What should you do?', '["Take money from your own pocket quietly", "Report it to your supervisor honestly", "Ignore it", "Blame the customer"]', 1),
  (3, 'A customer hands you a R200 note that feels and looks strange. What do you do?', '["Accept it to keep the line moving", "Check the security features and call a supervisor if unsure", "Tear it up", "Give it back and shout"]', 1),
  (4, 'The card machine is offline. What is the best response?', '["Tell the customer to leave", "Apologise, offer cash or another till, and call a supervisor", "Write down their card number", "Wait without saying anything"]', 1),
  (5, 'Why should you count change back to the customer?', '["It wastes time", "It helps avoid mistakes and builds trust", "It is only for big amounts", "Customers do not like it"]', 1),
  (6, 'A customer wants to return an item without a slip. What should you do?', '["Refuse rudely", "Follow the shop returns policy and ask a supervisor", "Give cash straight away", "Keep the item for yourself"]', 1)
) as v (position, question, options, answer_index);

with t as (
  insert into public.tests (skill, name, minutes, extra, question_count)
  values ('Data capturing', 'Data capturing', 6, null, 6)
  on conflict do nothing
  returning id
)
insert into public.test_questions (test_id, position, question, options, answer_index)
select t.id, v.position, v.question, v.options::jsonb, v.answer_index from t, (values
  (1, 'What is the most important thing when capturing data?', '["Speed only", "Accuracy", "Making it colourful", "Using capital letters"]', 1),
  (2, 'You see an ID number with 12 digits on a form. South African ID numbers have 13. What do you do?', '["Add a random digit", "Flag it and check with the source", "Leave the field empty without telling anyone", "Delete the whole form"]', 1),
  (3, 'Which date format avoids confusion between days and months?', '["03/04/24", "2024-04-03", "3 4 24", "April-ish 2024"]', 1),
  (4, 'Why should you save your work often?', '["To make the file bigger", "So you do not lose data if something crashes", "It is not needed", "To change the font"]', 1),
  (5, 'You are capturing private client details. What should you do?', '["Share them on WhatsApp for help", "Keep them confidential and lock your screen when you leave", "Print extra copies to take home", "Post them on social media"]', 1),
  (6, 'Two records look the same in a list. What is this called?', '["A duplicate", "A formula", "A backup", "A filter"]', 0)
) as v (position, question, options, answer_index);

insert into public.jobs (title, company, area, full_area, pay, job_type, level, distance_text, travel_note, filters, needs, gap_course, description) values
  ('Junior Admin Assistant', 'Lerato Logistics', 'Braamfontein', 'Braamfontein, Johannesburg', 'R6 500/month', 'Full-time', 'Entry level', '6 km', 'Taxi about R30/day', array['Near me']::text[], array['Excel','Customer service','Matric','Report writing']::text[], 'Report writing', 'Answer phones, file documents, capture orders in Excel and help the office manager with daily reports.'),
  ('Call Centre Agent', 'Ubuntu Connect', 'Soweto', 'Soweto, Johannesburg', 'R5 800/month', 'Full-time', 'Entry level', '3 km', 'Walkable', array['Near me']::text[], array['Customer service','Digital literacy','Matric','Phone etiquette']::text[], 'Phone etiquette', 'Take inbound calls from customers, log queries on the computer and solve simple account problems.'),
  ('Social Media Helper', 'Kasi Bakes', 'Remote', 'Remote', 'R800 for a 1 week task', 'Microinternship', 'Entry level', 'Remote', 'No travel', array['Part-time','Internships']::text[], array['Social media','Canva','Digital literacy']::text[], 'Canva', 'Create 5 posts for a small bakery, schedule them and reply to comments for one week.'),
  ('Phone Repair Assistant', 'FixIt Mobile', 'Maponya Mall, Soweto', 'Maponya Mall, Soweto', 'R4 200/month', 'Part-time', 'Entry level', '4 km', 'Taxi about R20/day', array['Near me','Part-time']::text[], array['Phone repair','Customer service','Cashier']::text[], 'Cashier', 'Help the technician with screen and battery repairs, test phones and take payments.'),
  ('Cashier', 'Kasi Fresh Market', 'Protea Glen', 'Protea Glen, Soweto', 'R4 800/month', 'Full-time', 'Entry level', '8 km', 'Taxi about R26/day', array['Near me']::text[], array['Cashier','Cash handling','Customer service','Matric']::text[], 'Cash handling', 'Serve customers at the till, handle cash and card payments and keep your till area tidy.'),
  ('Data Capturer', 'Mzansi Health Records', 'Johannesburg CBD', 'Marshalltown, Johannesburg', 'R5 500/month', 'Contract', 'Entry level', '14 km', 'Taxi about R36/day', array[]::text[], array['Data capturing','Typing','Excel','Matric']::text[], 'Typing', 'Capture patient forms into the records system accurately and check for missing details.'),
  ('Delivery Driver', 'QuickDrop Couriers', 'Midrand', 'Midrand, Gauteng', 'R7 000/month', 'Full-time', 'Entry level', '35 km', 'Company vehicle provided', array[]::text[], array['Driving','Customer service','Matric']::text[], 'Customer service', 'Deliver parcels around Gauteng. You need a valid Code 8 (B) licence and a clean driving record.'),
  ('Maths Tutor', 'Grow Learning Centre', 'Dobsonville', 'Dobsonville, Soweto', 'R120/hour', 'Part-time', 'Entry level', '5 km', 'Taxi about R24/day', array['Near me','Part-time']::text[], array['Tutoring','Communication','Matric']::text[], 'Communication', 'Help Grade 8 to 10 learners with homework after school, three afternoons a week.');

insert into public.mentors (initials, name, role, rating, about) values
  ('NL', 'Nomsa L.', 'HR Manager · 8 years', 4.9, 'Helps with CVs, first jobs and interviews.'),
  ('SK', 'Sipho K.', 'Software Developer · 5 years', 4.8, 'Helps with tech careers and learnerships.'),
  ('LM', 'Lindiwe M.', 'Retail Store Manager · 10 years', 4.8, 'Helps with retail, cashier and customer service jobs.'),
  ('AP', 'Ayesha P.', 'Small business owner · 6 years', 4.7, 'Helps with starting a side business and informal work.');
