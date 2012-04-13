var mmoac = { n: 2, l: 0 };

function ummoac(c) {
 if(typeof(c) != undefined && c != null) {
    if(typeof(c.n) != undefined && c.n != null) {
	mmoac.n = c.n;
    }
    if(typeof(c.l) != undefined && c.l != null) {
	mmoac.l = c.l;
    }
 }
}

twttr.anywhere(function (T) { T("#login").connectButton(); });
