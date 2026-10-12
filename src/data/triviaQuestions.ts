export interface TriviaQuestion {
  category: string;
  q: string;
  options: [string, string, string, string];
  answer: number; // index into options
}

export const TRIVIA: TriviaQuestion[] = [
  // Geography
  { category: 'Geography', q: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt'], answer: 1 },
  { category: 'Geography', q: 'Which is the longest river in Nigeria?', options: ['River Niger', 'River Kaduna', 'Cross River', 'River Ogun'], answer: 0 },
  { category: 'Geography', q: 'How many states does Nigeria have?', options: ['30', '32', '36', '37'], answer: 2 },
  { category: 'Geography', q: 'Which of these countries does NOT share a border with Nigeria?', options: ['Benin', 'Niger', 'Ghana', 'Cameroon'], answer: 2 },
  { category: 'Geography', q: 'Olumo Rock is a famous landmark in which state?', options: ['Ogun', 'Kogi', 'Oyo', 'Plateau'], answer: 0 },
  { category: 'Geography', q: 'Yankari Game Reserve is in which state?', options: ['Kaduna', 'Bauchi', 'Cross River', 'Edo'], answer: 1 },
  { category: 'Geography', q: 'Which ocean does Nigeria\'s coast face?', options: ['Indian Ocean', 'Pacific Ocean', 'Atlantic Ocean', 'Arctic Ocean'], answer: 2 },
  { category: 'Geography', q: 'Which is the largest city in Nigeria by population?', options: ['Abuja', 'Ibadan', 'Kano', 'Lagos'], answer: 3 },
  // History
  { category: 'History', q: 'In which year did Nigeria gain independence?', options: ['1957', '1960', '1963', '1966'], answer: 1 },
  { category: 'History', q: 'Who was the first President of Nigeria?', options: ['Obafemi Awolowo', 'Nnamdi Azikiwe', 'Olusegun Obasanjo', 'Shehu Shagari'], answer: 1 },
  { category: 'History', q: 'Who was Nigeria\'s first Prime Minister?', options: ['Abubakar Tafawa Balewa', 'Ahmadu Bello', 'Yakubu Gowon', 'Murtala Mohammed'], answer: 0 },
  { category: 'History', q: 'The capital officially moved from Lagos to Abuja in which year?', options: ['1976', '1985', '1991', '1999'], answer: 2 },
  { category: 'History', q: 'Who is credited with coining the name "Nigeria"?', options: ['Flora Shaw', 'Mungo Park', 'Herbert Macaulay', 'Nnamdi Azikiwe'], answer: 0 },
  { category: 'History', q: 'In which year did Nigeria\'s current democratic era begin?', options: ['1993', '1995', '1999', '2003'], answer: 2 },
  // Culture & food
  { category: 'Food', q: 'Which dish is made from steamed ground beans?', options: ['Egusi', 'Moi moi', 'Ofada', 'Ogbono'], answer: 1 },
  { category: 'Food', q: 'What is the main ingredient of egusi soup?', options: ['Pumpkin leaves', 'Melon seeds', 'Okra', 'Groundnuts'], answer: 1 },
  { category: 'Food', q: 'Amala is traditionally made from what?', options: ['Cassava flour', 'Rice flour', 'Yam flour', 'Maize flour'], answer: 2 },
  { category: 'Culture', q: 'The Argungu festival is famous for what?', options: ['Boat racing', 'Fishing', 'Wrestling', 'Masquerades'], answer: 1 },
  { category: 'Culture', q: 'The Osun-Osogbo festival is celebrated by which group?', options: ['Hausa', 'Igbo', 'Yoruba', 'Tiv'], answer: 2 },
  { category: 'Culture', q: 'Nigeria\'s three largest ethnic groups are Hausa, Yoruba and...?', options: ['Igbo', 'Ijaw', 'Efik', 'Nupe'], answer: 0 },
  { category: 'Culture', q: 'What is the currency of Nigeria?', options: ['Cedi', 'Rand', 'Naira', 'Shilling'], answer: 2 },
  { category: 'Culture', q: 'Which city is the main hub of Nollywood?', options: ['Lagos', 'Abuja', 'Enugu', 'Jos'], answer: 0 },
  // Arts & music
  { category: 'Arts', q: 'Who pioneered the Afrobeat music genre?', options: ['King Sunny Ade', 'Fela Kuti', 'Sade', 'Ebenezer Obey'], answer: 1 },
  { category: 'Arts', q: 'Who wrote the novel "Things Fall Apart"?', options: ['Wole Soyinka', 'Chimamanda Adichie', 'Chinua Achebe', 'Ben Okri'], answer: 2 },
  { category: 'Arts', q: 'Which Nigerian won the Nobel Prize in Literature in 1986?', options: ['Chinua Achebe', 'Wole Soyinka', 'Ben Okri', 'Cyprian Ekwensi'], answer: 1 },
  { category: 'Arts', q: 'Which Nigerian artist won a Grammy for the album "Twice as Tall"?', options: ['Wizkid', 'Davido', 'Burna Boy', 'Tems'], answer: 2 },
  // Sports
  { category: 'Sports', q: 'What is the Nigerian national football team nicknamed?', options: ['Black Stars', 'Super Eagles', 'Indomitable Lions', 'Elephants'], answer: 1 },
  { category: 'Sports', q: 'In which city did Nigeria win Olympic football gold in 1996?', options: ['Barcelona', 'Atlanta', 'Sydney', 'Seoul'], answer: 1 },
  { category: 'Sports', q: 'In which year did Nigeria first win the Africa Cup of Nations?', options: ['1976', '1980', '1994', '2013'], answer: 1 },
  { category: 'Sports', q: 'Basketball great Hakeem Olajuwon was born in which Nigerian city?', options: ['Kano', 'Ibadan', 'Lagos', 'Calabar'], answer: 2 },
  // General
  { category: 'General', q: 'What are the colours of the Nigerian flag?', options: ['Green and white', 'Green and gold', 'Red and white', 'Green, white and red'], answer: 0 },
  { category: 'General', q: 'How many vertical bands does the Nigerian flag have?', options: ['2', '3', '4', '5'], answer: 1 },
  { category: 'General', q: 'Nigeria is the most populous country in which continent?', options: ['Asia', 'Africa', 'South America', 'Europe'], answer: 1 },
  { category: 'General', q: 'What is Nigeria\'s national motto?', options: ['Unity and Faith, Peace and Progress', 'Freedom and Justice', 'One Nation, One Destiny', 'Strength in Unity'], answer: 0 },
];
