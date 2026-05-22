export interface ReadingPreset {
  id: string;
  language: string;
  title: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate';
  description: string;
  content: string;
}

export const readingPresets: ReadingPreset[] = [
  {
    id: 'spanish-first-morning',
    language: 'Spanish',
    title: 'Mi primera mañana',
    topic: 'Daily routine',
    difficulty: 'beginner',
    description: 'A short, gentle routine text for learning everyday actions.',
    content:
      'Me llamo Ana. Vivo en una casa pequeña con mi familia. Por la mañana, me levanto temprano y bebo agua. Después, como pan con fruta. Mi hermano va a la escuela y mi madre va al trabajo. Yo camino por la ciudad y veo a mis amigos. Hoy es un día tranquilo. Quiero estudiar español, leer un poco y escuchar música por la noche.',
  },
  {
    id: 'spanish-cafe-dialogue',
    language: 'Spanish',
    title: 'En el café',
    topic: 'Ordering food',
    difficulty: 'beginner',
    description: 'A simple dialogue about ordering something to eat and drink.',
    content:
      'Luis entra en un café pequeño. La camarera sonríe y dice: Hola, ¿qué quieres? Luis dice: Quiero un café con leche y un pan dulce, por favor. La camarera pregunta: ¿Algo más? Luis mira la mesa y responde: Sí, también quiero agua. Después, Luis se sienta cerca de la ventana. Bebe su café, come su pan y lee un libro corto.',
  },
  {
    id: 'spanish-new-friend',
    language: 'Spanish',
    title: 'Una nueva amiga',
    topic: 'Meeting people',
    difficulty: 'beginner',
    description: 'A friendly story about introductions, names, and interests.',
    content:
      'En la escuela, Pedro conoce a una chica nueva. Ella se llama Marta y viene de otra ciudad. Pedro dice: Hola, soy Pedro. Marta responde: Mucho gusto. A Marta le gusta leer, cocinar y caminar en el parque. Pedro también quiere practicar inglés y español. Los dos hablan durante la clase y después van a comer con otros amigos.',
  },
  {
    id: 'vietnamese-first-morning',
    language: 'Vietnamese',
    title: 'Buổi sáng đầu tiên',
    topic: 'Daily routine',
    difficulty: 'beginner',
    description: 'A short daily routine text with common beginner words.',
    content:
      'Tôi tên là Lan. Tôi sống trong một ngôi nhà nhỏ với gia đình. Buổi sáng, tôi thức dậy sớm và uống nước. Sau đó, tôi ăn bánh mì với trái cây. Em trai tôi đi học và mẹ tôi đi làm. Tôi đi bộ trong thành phố và gặp bạn. Hôm nay là một ngày yên tĩnh. Tôi muốn học tiếng Việt, đọc một chút và nghe nhạc vào buổi tối.',
  },
  {
    id: 'vietnamese-cafe-dialogue',
    language: 'Vietnamese',
    title: 'Ở quán cà phê',
    topic: 'Ordering food',
    difficulty: 'beginner',
    description: 'A simple cafe scene for food, drink, and polite requests.',
    content:
      'Minh đi vào một quán cà phê nhỏ. Nhân viên cười và nói: Xin chào, bạn muốn gì? Minh nói: Tôi muốn một cà phê sữa và một cái bánh, làm ơn. Nhân viên hỏi: Bạn muốn thêm gì không? Minh nhìn bàn và trả lời: Có, tôi cũng muốn nước. Sau đó, Minh ngồi gần cửa sổ, uống cà phê và đọc một cuốn sách ngắn.',
  },
  {
    id: 'vietnamese-new-friend',
    language: 'Vietnamese',
    title: 'Một người bạn mới',
    topic: 'Meeting people',
    difficulty: 'beginner',
    description: 'A starter story about names, friends, and simple interests.',
    content:
      'Ở trường, Nam gặp một bạn mới. Bạn ấy tên là Hoa và đến từ một thành phố khác. Nam nói: Xin chào, mình là Nam. Hoa trả lời: Rất vui được gặp bạn. Hoa thích đọc sách, nấu ăn và đi bộ trong công viên. Nam cũng muốn học tiếng Anh và tiếng Việt. Hai người nói chuyện trong lớp và sau đó đi ăn với các bạn khác.',
  },
];

export function getReadingPresets(language?: string) {
  return readingPresets.filter((preset) => !language || preset.language === language);
}

export function getReadingPreset(presetId: string) {
  return readingPresets.find((preset) => preset.id === presetId);
}
