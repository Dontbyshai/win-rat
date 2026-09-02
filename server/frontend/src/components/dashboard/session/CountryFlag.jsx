import ReactCountryFlag from "react-country-flag";

function CountryFlag({ country, width, height}) {
    return (
        <ReactCountryFlag
            countryCode={country}
            svg
            style={{
                width: width,
                height: height,
            }}
            title={country}
            />
    );
}

export default CountryFlag;