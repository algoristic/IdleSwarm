import { SiteTypeId } from '../../../domain/models/site.model';

export interface SiteIconCase {
  type: SiteTypeId;
  shape: number;
  radius: number;
  markup: string;
}

export const PROTOTYPE_SITE_ICONS: SiteIconCase[] = [
  {
    type: 'algae',
    shape: 12345,
    radius: 15,
    markup:
      '<path d="M13.0 -3.4Q17.1 0.5 13.2 4.7Q9.2 9.0 4.2 12.3Q-0.7 15.7 -3.9 13.6Q-7.1 11.6 -10.3 6.8Q-13.4 2.0 -15.0 -2.1Q-16.7 -6.2 -11.0 -8.0Q-5.3 -9.7 -0.1 -13.5Q5.0 -17.3 7.0 -12.3Q8.9 -7.3 13.0 -3.4Z" fill="#22a86a" transform="translate(1.3499999999999999 1.7999999999999998)"/><path d="M13.0 -3.4Q17.1 0.5 13.2 4.7Q9.2 9.0 4.2 12.3Q-0.7 15.7 -3.9 13.6Q-7.1 11.6 -10.3 6.8Q-13.4 2.0 -15.0 -2.1Q-16.7 -6.2 -11.0 -8.0Q-5.3 -9.7 -0.1 -13.5Q5.0 -17.3 7.0 -12.3Q8.9 -7.3 13.0 -3.4Z" fill="#8cf25a"/>',
  },
  {
    type: 'algae',
    shape: 987,
    radius: 9.3,
    markup:
      '<path d="M9.3 -3.1Q10.6 0.0 9.6 3.8Q8.6 7.5 4.3 8.8Q0.0 10.1 -3.7 9.0Q-7.4 7.9 -7.1 4.9Q-6.9 2.0 -7.2 -0.6Q-7.6 -3.3 -4.8 -5.8Q-2.0 -8.4 0.0 -8.8Q2.0 -9.2 5.0 -7.7Q8.0 -6.2 9.3 -3.1Z" fill="#22a86a" transform="translate(0.8370000000000001 1.116)"/><path d="M9.3 -3.1Q10.6 0.0 9.6 3.8Q8.6 7.5 4.3 8.8Q0.0 10.1 -3.7 9.0Q-7.4 7.9 -7.1 4.9Q-6.9 2.0 -7.2 -0.6Q-7.6 -3.3 -4.8 -5.8Q-2.0 -8.4 0.0 -8.8Q2.0 -9.2 5.0 -7.7Q8.0 -6.2 9.3 -3.1Z" fill="#8cf25a"/>',
  },
  {
    type: 'plankton',
    shape: 12345,
    radius: 15,
    markup:
      '<circle r="15" fill="#233e8b"/><circle r="10.05" fill="#275597"/><g fill="#8ffcff"><circle cx="7.0" cy="4.8" r="1.8"/><circle cx="1.0" cy="0.2" r="1.1"/><circle cx="0.7" cy="-7.1" r="1.7"/><circle cx="1.1" cy="-5.3" r="1.2"/><circle cx="-0.9" cy="8.2" r="1.8"/><circle cx="3.2" cy="4.4" r="1.1"/><circle cx="-0.4" cy="3.8" r="1.7"/><circle cx="2.3" cy="8.6" r="1.2"/></g>',
  },
  {
    type: 'plankton',
    shape: 987,
    radius: 9.3,
    markup:
      '<circle r="9.3" fill="#233e8b"/><circle r="6.231000000000001" fill="#275597"/><g fill="#8ffcff"><circle cx="5.2" cy="0.3" r="1.0"/><circle cx="-2.0" cy="-4.9" r="0.7"/><circle cx="-1.0" cy="0.5" r="0.9"/><circle cx="-4.0" cy="-1.1" r="1.0"/><circle cx="1.1" cy="1.7" r="1.0"/><circle cx="1.5" cy="-3.5" r="0.9"/><circle cx="-5.2" cy="2.4" r="0.7"/><circle cx="1.8" cy="-2.7" r="0.8"/></g>',
  },
  {
    type: 'carcass',
    shape: 12345,
    radius: 15,
    markup:
      '<g transform="rotate(35) scale(2.38)"><g stroke="#ff6a3d" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M-3 3l-3 4M0 3.6l-1 4.6M3 3l3 4M-3-3l-3-4M0-3.6l-1-4.6M3-3l3-4"/><path d="M5.4-1.5q3.5-2 4.5-5M5.4 1.5q3.5 2 4.5 5"/></g><path d="M5.0 -1.7Q5.5 0.2 4.4 1.9Q3.2 3.7 1.0 4.4Q-1.2 5.2 -2.4 4.3Q-3.6 3.4 -4.3 1.2Q-4.9 -1.0 -4.4 -2.5Q-3.9 -4.0 -1.9 -4.3Q0.1 -4.6 2.3 -4.1Q4.4 -3.5 5.0 -1.7Z" fill="#ff6a3d" transform="translate(.6 .9)"/><path d="M5.0 -1.7Q5.5 0.2 4.4 1.9Q3.2 3.7 1.0 4.4Q-1.2 5.2 -2.4 4.3Q-3.6 3.4 -4.3 1.2Q-4.9 -1.0 -4.4 -2.5Q-3.9 -4.0 -1.9 -4.3Q0.1 -4.6 2.3 -4.1Q4.4 -3.5 5.0 -1.7Z" fill="#ffb07a"/></g>',
  },
  {
    type: 'carcass',
    shape: 987,
    radius: 9.3,
    markup:
      '<g transform="rotate(3) scale(1.48)"><g stroke="#ff6a3d" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M-3 3l-3 4M0 3.6l-1 4.6M3 3l3 4M-3-3l-3-4M0-3.6l-1-4.6M3-3l3-4"/><path d="M5.4-1.5q3.5-2 4.5-5M5.4 1.5q3.5 2 4.5 5"/></g><path d="M4.7 -1.8Q5.5 0.0 4.7 2.1Q3.9 4.1 1.5 4.7Q-0.9 5.3 -2.8 4.1Q-4.7 2.9 -4.7 1.3Q-4.7 -0.3 -4.0 -2.0Q-3.3 -3.7 -0.9 -4.3Q1.5 -4.8 2.7 -4.2Q3.8 -3.5 4.7 -1.8Z" fill="#ff6a3d" transform="translate(.6 .9)"/><path d="M4.7 -1.8Q5.5 0.0 4.7 2.1Q3.9 4.1 1.5 4.7Q-0.9 5.3 -2.8 4.1Q-4.7 2.9 -4.7 1.3Q-4.7 -0.3 -4.0 -2.0Q-3.3 -3.7 -0.9 -4.3Q1.5 -4.8 2.7 -4.2Q3.8 -3.5 4.7 -1.8Z" fill="#ffb07a"/></g>',
  },
  {
    type: 'marineSnow',
    shape: 12345,
    radius: 15,
    markup:
      '<circle r="15" fill="#374287"/><g fill="#f6f4ff"><circle cx="7.9" cy="5.5" r="2.9"/><circle cx="1.1" cy="0.3" r="1.6"/><circle cx="0.8" cy="-8.0" r="2.9"/><circle cx="1.3" cy="-5.9" r="1.8"/><circle cx="-1.0" cy="9.3" r="3.0"/><circle cx="3.6" cy="4.9" r="1.6"/><circle cx="-0.4" cy="4.3" r="2.8"/></g>',
  },
  {
    type: 'marineSnow',
    shape: 987,
    radius: 9.3,
    markup:
      '<circle r="9.3" fill="#374287"/><g fill="#f6f4ff"><circle cx="5.9" cy="0.3" r="1.7"/><circle cx="-2.3" cy="-5.5" r="1.0"/><circle cx="-1.2" cy="0.5" r="1.4"/><circle cx="-4.5" cy="-1.2" r="1.5"/><circle cx="1.2" cy="1.9" r="1.6"/><circle cx="1.7" cy="-3.9" r="1.5"/><circle cx="-5.8" cy="2.7" r="1.0"/></g>',
  },
  {
    type: 'seagrass',
    shape: 12345,
    radius: 15,
    markup:
      '<ellipse cy="7.5" rx="16.5" ry="4.5" fill="#1e7e66"/><path d="M-13.1 7.5Q-8.0 -3.0 -6.4 -10.0Q-8.4 -1.3 -10.9 7.5Z" fill="#22a86a"/><path d="M-10.1 7.5Q-14.6 -8.4 -16.8 -19.0Q-11.1 -5.7 -8.0 7.5Z" fill="#8cf25a"/><path d="M-7.0 7.5Q-11.4 -2.5 -13.5 -9.1Q-8.0 -0.8 -5.0 7.5Z" fill="#22a86a"/><path d="M-4.0 7.5Q-2.0 -7.2 -1.6 -17.0Q-1.2 -4.8 -1.9 7.5Z" fill="#8cf25a"/><path d="M-1.1 7.5Q3.4 -8.2 4.8 -18.6Q3.2 -5.5 1.1 7.5Z" fill="#22a86a"/><path d="M1.9 7.5Q-0.7 -4.5 -2.1 -12.5Q2.0 -2.5 4.0 7.5Z" fill="#8cf25a"/><path d="M5.0 7.5Q9.5 -4.1 10.9 -11.8Q9.3 -2.2 7.0 7.5Z" fill="#22a86a"/><path d="M8.0 7.5Q4.8 -8.6 3.1 -19.3Q7.7 -5.9 10.1 7.5Z" fill="#8cf25a"/><path d="M10.9 7.5Q6.4 -4.5 4.2 -12.6Q9.8 -2.5 13.1 7.5Z" fill="#22a86a"/>',
  },
  {
    type: 'seagrass',
    shape: 987,
    radius: 9.3,
    markup:
      '<ellipse cy="4.65" rx="10.230000000000002" ry="2.79" fill="#1e7e66"/><path d="M-8.1 4.65Q-5.0 -1.5 -4.0 -5.6Q-5.2 -0.5 -6.8 4.65Z" fill="#22a86a"/><path d="M-6.2 4.65Q-4.2 -4.5 -3.6 -10.7Q-4.0 -3.0 -4.9 4.65Z" fill="#8cf25a"/><path d="M-4.4 4.65Q-6.6 -4.8 -7.8 -11.1Q-4.7 -3.2 -3.1 4.65Z" fill="#22a86a"/><path d="M-2.5 4.65Q-5.3 -3.2 -6.7 -8.4Q-3.2 -1.9 -1.2 4.65Z" fill="#8cf25a"/><path d="M-0.7 4.65Q0.3 -3.3 0.4 -8.6Q0.9 -2.0 0.7 4.65Z" fill="#22a86a"/><path d="M1.2 4.65Q3.1 -3.5 3.6 -8.9Q3.3 -2.1 2.5 4.65Z" fill="#8cf25a"/><path d="M3.1 4.65Q0.9 -2.1 -0.2 -6.6Q2.8 -1.0 4.4 4.65Z" fill="#22a86a"/><path d="M4.9 4.65Q7.9 -4.5 8.9 -10.6Q7.7 -3.0 6.2 4.65Z" fill="#8cf25a"/><path d="M6.8 4.65Q8.2 -3.1 8.5 -8.3Q8.6 -1.8 8.1 4.65Z" fill="#22a86a"/>',
  },
];

export const PROTOTYPE_ICON_RADIUS = {
  algae: 15,
  plankton: 15,
  carcass: 14,
  marineSnow: 14,
  seagrass: 30,
};
