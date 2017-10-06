var template_string_apa =
    '{creators} ({publication_year}). ' +
    '{title}. {item_type}. {doi_or_uri}. ' +
    'Accessed {todays_date}.';

function todays_date_str() {
    var currentTime = new Date();
    var month = currentTime.getMonth() + 1 < 10 ? '0' + currentTime.getMonth() + 1 : currentTime.getMonth() + 1;
    var day = currentTime.getDay() < 10 ? '0' + currentTime.getDay() : currentTime.getDay();
    return currentTime.getFullYear() + '-' + month + '-' + day;
}

var template_vars_dummy = {
    creators: 'Car, N.J., Ip, A.',
    publication_year: '2016',
    title: 'ncskos code repository',
    item_type: 'A Geoscience Australia catalogue item',
    doi_or_uri: 'http://pid.geoscience.gov.au/dataset/ga/103620',
    todays_date: todays_date_str()
};

function titleCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(function(word) {
            return word[0].toUpperCase() + word.substr(1);
        })
        .join(' ');
}

var trimChars = (function () {
    "use strict";

    function escapeRegex(string) {
        return string.replace(/[\[\](){}?*+\^$\\.|\-]/g, "\\$&");
    }

    return function trim(str, characters, flags) {
        flags = flags || "g";
        if (typeof str !== "string" || typeof characters !== "string" || typeof flags !== "string") {
            throw new TypeError("argument must be string");
        }

        if (!/^[gi]*$/.test(flags)) {
            throw new TypeError("Invalid flags supplied '" + flags.match(new RegExp("[^gi]*")) + "'");
        }

        characters = escapeRegex(characters);

        return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
    };
}());

function render_template(template, template_vars) {
    for (var key in template_vars) {
        template = template.replace('{' + key +'}', template_vars[key]);
    }
    return template;
}

// TODO: complete
function validate_doi_format(doi) {
    var re = new RegExp("10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?![\"&\\'<>])\\S)+");
    if (!re.test(doi))
        return 'The DOI is not valid. It must start with \'10.\', followed by a 4+ digit number, followed by \'/\' followed by a string of numbers or characters.';

    return 'valid';
}


function get_template_vars_from_doi(doi) {
    var datacite_uri_stem = 'https://api.datacite.org/works/';
    var crossref_uri_stem = 'https://api.crossref.org/works/';

    // 10.4225/25/5524BA4A047FE         -- GA author
    // 10.4225/25/55ECC900C9DAF         -- GA author
    // 10.4225/25/570732FF9FEB2         -- multi author
    // 10.4225/25/5702018E0CAC7         -- multi author
    // 10.4225/25/5549B03B2401E         -- multi author
    // 10.5524/100068                   -- DataCite non-GA
    // 10.11636/Record.2017.016         -- GA CrossRef
    // 10.1126/science.169.3946.635     -- non-GA
    // 10.1038/nrd842                   -- non-GA

    // try DataCite
    $.get(datacite_uri_stem + doi, function(data) {
        var authors = [];
        data.data.attributes.author.forEach(function (author) {
            if (typeof author.literal !== 'undefined') {
                authors.push(author.literal);
            } else {
                authors.push(author.family + ', ' + author.given);
            }
        });

        var template_vars = {
            creators: authors.join(', '),
            publication_year: data.data.attributes['published'],
            title: trimChars(data.data.attributes['title'], '.'),
            item_type: data.data.attributes['container-title'] + ' ' + titleCase(data.data.attributes['resource-type-id']),
            doi_or_uri: 'DOI:' + doi,
            todays_date: todays_date_str()
        };
        $('#citation').val(render_template(template_string_apa, template_vars));
    }).fail(function() {
        //$('#citation').val('DataCite error');
        // try CrossRef
        $.get(crossref_uri_stem + doi, function(data) {
            var authors = [];
            data.message.author.forEach(function (author) {
                if (typeof author.literal !== 'undefined') {
                    authors.push(author.literal);
                } else {
                    authors.push(author.family + ', ' + author.given);
                }
            });

            var template_vars = {
                creators: authors.join(', '),
                publication_year: data.message['published-online']['date-parts'][0],
                title: data.message.title,
                item_type: data.message.publisher + ' ' + titleCase(data.message.type),
                doi_or_uri: 'DOI:' + doi,
                todays_date: todays_date_str()
            };
            $('#citation').val(render_template(template_string_apa, template_vars));
        }).fail(function() {
            $('#citation').val('Could not retrieve a citation from either DataCite or CrossRef');
        });
    });

    $('#citation').show();
}

$(function() {
    $('#citation').hide();
    $('#get-text').click(function () {
        var doi = $('#doi-in').val();
        var doi_is_valid = validate_doi_format(doi);
        if (doi_is_valid.localeCompare('valid') != 0) {
            $('#doi-in').css({'border-width': '2px'});
            $('#doi-in').css({'border-color': 'red'});
            $('#citation').val(doi_is_valid);
            $('#citation').show();
            $('#doi-in').focus();
        } else {
            $('#doi-in').css({'border-color': 'black'});
            $('#doi-in').css({'border-width': '1px'});
            get_template_vars_from_doi(doi);
        }
    });
});