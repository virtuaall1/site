"""python3 test_rules.py — проверка правил без телеграма."""
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from rules import check   # noqa: E402

def case(name, want, **kw):
    kw.setdefault('is_new', True)
    kw.setdefault('has_link_perm', False)
    kw.setdefault('recent', [])
    got = check(kw.pop('text'), **kw).action
    good = got == want
    print(('  ок  ' if good else 'ПАДАЕТ') + f'  {name}')
    if not good:
        print(f'        ожидали {want}, получили {got}')
    return good

ok = True
ok &= case('обычное сообщение', 'ok', text='всім привіт, хтось знає гарного майстра?')
ok &= case('ссылка от новичка', 'delete', text='дивіться https://example.com')
ok &= case('ссылка от старожила', 'ok', text='дивіться https://example.com', has_link_perm=True)
ok &= case('рассылка про заработок', 'mute', text='заробіток на крипті без вкладень')
ok &= case('спам-слово со ссылкой', 'mute', text='казино t.me/xxx')
ok &= case('обход через латиницу', 'mute', text='зapaбoтoк на кpиптe')
ok &= case('повтор', 'mute', text='купіть це', recent=['купіть це', 'купіть це'])
ok &= case('флуд', 'warn', text='ще', recent=['а', 'б', 'в', 'г', 'д'])
ok &= case('капс', 'warn', text='ЧОМУ НІХТО НЕ ВІДПОВІДАЄ НА МОЄ ПИТАННЯ')
ok &= case('короткий капс не считается', 'ok', text='ОК')
ok &= case('стоп-слово админа', 'delete', text='продам гараж', blacklist=('гараж',))

print('\nвсё сошлось' if ok else '\nесть расхождения')
sys.exit(0 if ok else 1)
