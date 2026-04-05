export const getLocationFromIP = async (ip: string) => {
  try {
    if (!ip || ip === '::1') {
      return 'Đà Nẵng, Việt Nam';
    }

    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data: {
      city?: string;
      country_name?: string;
    } = await res.json();

    const city = data.city;
    const country = data.country_name;

    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    if (city) return city;

    return 'Unknown location';
  } catch (error) {
    console.error('IP location error:', error);
    return 'Unknown location';
  }
};