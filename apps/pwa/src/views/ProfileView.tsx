import { useStore } from '../lib/store';
import { StatRing } from '../components/StatRing';
import { Field } from '../components/Field';
import { useOnline } from '../lib/hooks';
import { pluralize } from '../lib/format';
import { APP_CHANNEL, APP_VERSION } from '../lib/version';

export function ProfileView() {
  const { profile, items, updateProfile, saveProfile } = useStore();
  const online = useOnline();

  const sold = items.filter(item => item.status === 'sold').length;
  const live = items.filter(item => item.status === 'available' || item.status === 'lot').length;

  return (
    <section className="view profile-view">
      <header className="view-head">
        <p className="eyebrow">продавец</p>
        <h1>Профиль</h1>
      </header>

      <div className="profile-card">
        <div className="avatar">{(profile.name || 'Б').trim().charAt(0).toUpperCase()}</div>
        <div className="profile-id">
          <strong>{profile.name || 'Без имени'}</strong>
          <span>{profile.city || 'Город не указан'}</span>
        </div>
        <span className={`net-dot ${online ? 'on' : 'off'}`}>{online ? 'online' : 'офлайн'}</span>
      </div>

      <div className="rings">
        <StatRing value={items.length} max={Math.max(10, items.length)} display={String(items.length)} label="товаров" />
        <StatRing value={profile.rating} max={5} display={profile.rating.toFixed(1)} label="рейтинг" />
        <StatRing value={profile.deals} max={Math.max(10, profile.deals)} display={String(profile.deals)} label={pluralize(profile.deals, 'сделка', 'сделки', 'сделок')} />
      </div>

      <div className="form-grid">
        <Field label="Имя" wide>
          <input value={profile.name} onChange={event => updateProfile({ name: event.target.value })} placeholder="Имя или магазин" />
        </Field>
        <Field label="Город">
          <input value={profile.city} onChange={event => updateProfile({ city: event.target.value })} placeholder="Симферополь" />
        </Field>
        <Field label="Контакт">
          <input value={profile.contact} onChange={event => updateProfile({ contact: event.target.value })} placeholder="@username" />
        </Field>
      </div>

      <button type="button" className="solid-btn wide big" onClick={saveProfile}>Сохранить профиль</button>

      <div className="profile-foot">
        <span>В наличии: {live} · продано: {sold}</span>
        <span className="version-tag">БУ.шка · {APP_VERSION} · {APP_CHANNEL}</span>
        <small>Данные хранятся локально на этом устройстве</small>
      </div>
    </section>
  );
}
