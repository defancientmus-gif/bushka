import { LEGAL_HASH, formatConsentDate, type PdConsent } from '../lib/legal';

export type ConsentTicks = { pd: boolean; publish: boolean };

/** Согласия под формой — два отдельных (ст. 9 и ст. 10.1 152-ФЗ), галочки по умолчанию пустые.
 *  Не барьер: без них товар всё равно сохраняется в склад, просто не уходит в общую витрину. */
export function PdConsentBox({
  consent,
  ticks,
  onChange
}: {
  consent: PdConsent | null;
  ticks: ConsentTicks;
  onChange: (next: ConsentTicks) => void;
}) {
  if (consent) {
    return (
      <p className="consent-done">
        Объявление увидят в общей витрине · согласие дано {formatConsentDate(consent.at)} · <a href={LEGAL_HASH.policy}>ваши данные</a>
      </p>
    );
  }
  return (
    <div className="consent-box">
      <label className="consent-row">
        <input type="checkbox" checked={ticks.pd} onChange={event => onChange({ ...ticks, pd: event.target.checked })} />
        <span>
          Согласен на <a href={LEGAL_HASH.consent}>обработку персональных данных</a> по <a href={LEGAL_HASH.policy}>политике</a>
        </span>
      </label>
      <label className="consent-row">
        <input type="checkbox" checked={ticks.publish} onChange={event => onChange({ ...ticks, publish: event.target.checked })} />
        <span>
          Согласен <a href={LEGAL_HASH.publish}>показывать в объявлении</a> имя, город и контакт
        </span>
      </label>
      <small className="consent-hint">Без галочек товар сохранится только в вашем складе — в витрину не попадёт.</small>
    </div>
  );
}
