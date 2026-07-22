<?php
/**
 * Приём заявок с сайта. Отправляет письмо и пишет строку в CSV.
 *
 * ПЕРЕД ПУБЛИКАЦИЕЙ:
 *   1. Указать реальный адрес получателя в $TO.
 *   2. Указать адрес отправителя на своём домене в $FROM — письма с чужого
 *      домена почтовые сервисы кладут в спам.
 *   3. Проверить, что папка ./data доступна для записи (права 755 или 775).
 */

declare(strict_types=1);

$TO   = 'info@souyzgeostab.kz';
$FROM = 'noreply@souyzgeostab.kz';            // TODO: создать ящик на домене
$LOG  = __DIR__ . '/data/leads.csv';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

/** Ловушка для ботов: поле скрыто в вёрстке, человек его не заполнит. */
if (!empty($_POST['company_website'])) {
    echo json_encode(['ok' => true]);   // боту отвечаем успехом, письмо не шлём
    exit;
}

/**
 * Форму строит скрипт Tilda, поэтому имена полей приходят её собственные:
 * «имя», «Phone», «Email», «ОПИСАНИЕ ПРОБЛЕМЫ». Проверяем оба набора,
 * чтобы обработчик пережил и замену формы на обычную.
 */
$field = static function (array $keys, int $max = 2000): string {
    foreach ($keys as $key) {
        $v = $_POST[$key] ?? '';
        if (!is_string($v) || trim($v) === '') continue;
        $v = trim($v);
        // Вырезаем переводы строк из коротких полей: через них подставляют
        // лишние заголовки письма
        if ($max <= 300) $v = str_replace(["\r", "\n"], ' ', $v);
        return mb_substr($v, 0, $max);
    }
    return '';
};

$name    = $field(['name', 'имя', 'Имя', 'Name'], 200);
$phone   = $field(['phone', 'Phone', 'tildaspec-phone-part[]'], 60);
$email   = $field(['email', 'Email'], 200);
$message = $field(['message', 'ОПИСАНИЕ ПРОБЛЕМЫ', 'Комментарий'], 4000);
$page    = $field(['page', 'tildaspec-formname'], 300);

$utm = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as $k) {
    $utm[$k] = $field([$k], 200);
}

// Телефон — единственное по-настоящему обязательное поле: по нему перезванивают
$digits = preg_replace('/\D/', '', $phone);
if ($name === '' || strlen((string) $digits) < 10) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'email']);
    exit;
}

$when = date('Y-m-d H:i:s');
$utmLine = implode(' | ', array_filter($utm)) ?: '—';

$body = "Заявка с сайта souyzgeostab.kz\n\n"
      . "Имя:      {$name}\n"
      . "Телефон:  {$phone}\n"
      . "Почта:    " . ($email ?: '—') . "\n"
      . "Страница: " . ($page ?: '—') . "\n"
      . "Источник: {$utmLine}\n"
      . "Время:    {$when}\n\n"
      . "Описание объекта:\n" . ($message ?: '—') . "\n";

$headers = [
    'From: СоюзГеоСтаб <' . $FROM . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: souyzgeostab-form'
];
// Reply-To ставим только на проверенный адрес, иначе получим инъекцию заголовков
if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта — ' . $name) . '?=';
$sent = @mail($TO, $subject, $body, implode("\r\n", $headers));

// Дублируем в файл: почта может не дойти, заявка теряться не должна
$dir = dirname($LOG);
if (!is_dir($dir)) @mkdir($dir, 0755, true);
if ($fh = @fopen($LOG, 'a')) {
    if (filesize($LOG) === 0) {
        fwrite($fh, "\xEF\xBB\xBF");   // BOM, чтобы Excel не ломал кириллицу
        fputcsv($fh, ['Дата', 'Имя', 'Телефон', 'Почта', 'Страница', 'UTM', 'Сообщение']);
    }
    fputcsv($fh, [$when, $name, $phone, $email, $page, $utmLine, $message]);
    fclose($fh);
}

echo json_encode(['ok' => true, 'mail' => $sent]);
