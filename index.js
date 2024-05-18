const express = require("express");
const fs= require('fs');//se refera la fisier ca OBIECT
const path=require('path');//se refera STRICT la cale, nu poate accesa fisierul
const sharp=require('sharp');
const sass=require('sass');
const ejs=require('ejs');
x=require('pg');
const Client=x.Client;

obGlobal ={
    obErori:null,
    obImagini:null,
    folderScss:path.join(__dirname,"/resurse/scss"),
    folderCss:path.join(__dirname,"/resurse/css"),
    folderBackup:path.join(__dirname,"backup"),

}
app= express();
console.log("Folder proiect", __dirname); //folderul fisierului
console.log("Cale fisier", __filename);
console.log("Director de lucru", process.cwd());//folderul de unde rulam comanda

app.set("view engine","ejs");

vect_foldere=["temp","temp1","backup"]
for(let folder of vect_foldere){
    let caleFolder=path.join(__dirname, folder)
    if(!fs.existsSync(caleFolder)){
        fs.mkdirSync(caleFolder);
    }
}

app.use("/resurse", express.static(__dirname+"/resurse"));
app.use("/node_modules", express.static(__dirname+"/node_modules"));



/*
trimiterea unui mesaj fix
trimiterea unui msj dinamic
trimiterea unui msj dinamic in functie de parametri(req.params;req.query)
*/

//Mesaj fix

app.get(["/", "/index", "/home"],function(req,res){
    //res.sendFile(__dirname+"/index.html")
    res.render("pagini/index", {ip: req.ip, imagini:obGlobal.obImagini.imagini});
})



app.get("/cerere", function(req, res){

        res.send("<b>Hello</b> <span style='color:red'>world!</span>");


})

//Mesaj dinamic
app.get("/data", function(req, res, next){

    res.write("Data: ");
    next();

})
app.get("/data", function(req, res){

    res.write(""+new Date());
    res.end();

})

/*trimiterea unui msj dinamic in functie de parametri(req.params;req.query)
*/
app.get("/suma/:a/:b", function(req, res){

    var suma=parseInt(req.params.a)+parseInt(req.params.b);
    res.send(""+suma);//res.send poate primi doar string, folosind + concatenam un string gol cu suma

})

app.get("favico.ico", function(req,res){
    afisareEroare(res, 400);
});

app.get("/*.ejs", function(req,res){
    res.sendFile(path.join(__dirname,"resurse/favicon/favicon.ico"))
});

//app.get(new RegExp("^\/resurse\/[A-Za-zo-0\/]*\/$"), function(req,res){
   // afisareEroare(res, 403);
//});

app.get("/*.ejs", function(req,res){
    console.log(req.url);
    try{
        res.render("pagini"+req.url, function(err, rezHtml){
       // console.log("Pagina", rezHtml)
       // console.log("Eroare", err)
       // res.send(rezHtml);
       if(err){
          if(err.message.startsWith("Failed to lookup view")){
            afisareEroare(res, 404);
            console.log("Nu a gasit pagina: ", req.url)
          }
       }
       else{
        res.send(rezHtml+"");
       }

    });
}
    catch(err1){

        if(err1.message.startsWith("Cannot find module")){
            afisareEroare(res, 404);
            console.log("Nu a gasit resursa: ", req.url)
        }
        else{
            afisareEroare(res)
        }
    
    }
 })

 function initErori(){
    var continut= fs.readFileSync(path.join(__dirname,"resurse/json/erori.json")).toString("utf-8");
    //console.log(continut);
    obGlobal.obErori=JSON.parse(continut);
    for (let eroare of obGlobal.obErori.info_erori){
        eroare.imagine=path.join(obGlobal.obErori.cale_baza,eroare.imagine);
    }
    obGlobal.obErori.eroare_default.imagine=path.join(obGlobal.obErori.cale_baza,obGlobal.obErori.
        eroare_default.imagine)
    //console.log(obGlobal.obErori);
 }
 initErori()

 function afisareEroare(res, _identificator, _titlu, _text, _imagine){
    let eroare= obGlobal.obErori.info_erori.find(
        function(elem){
            return elem.identificator==_identificator
        }
    )
    if (!eroare){
        let eroare_default=obGlobal.obErori.eroare_default
        res.render("pagini/eroare",{
            titlu:_titlu || eroare_default.titlu,
            text:_text || eroare_default.text,
            imagine:_imagine || eroare_default.imagine,


        })
    }
    else{
        if(eroare.status)
            res.status(eroare.identificator)
        
        res.render("pagini/eroare",{
             titlu:_titlu || eroare_default.titlu,
             text:_text || eroare_default.text,
             imagine:_imagine || eroare_default.imagine,
            })
    }
 }

 function initImagini(){
    var continut= fs.readFileSync(path.join(__dirname,"resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini=JSON.parse(continut);
    let vImagini=obGlobal.obImagini.imagini;

    let caleAbs=path.join(__dirname,obGlobal.obImagini.cale_galerie);
    let caleAbsMediu=path.join(__dirname,obGlobal.obImagini.cale_galerie, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    //for (let i=0; i< vErori.length; i++ )
    for (let imag of vImagini){
        [numeFis, ext]=imag.fisier.split(".");
        let caleFisAbs=path.join(caleAbs,imag.fisier);
        let caleFisMediuAbs=path.join(caleAbsMediu, numeFis+".webp");
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);
        imag.fisier_mediu=path.join("/", obGlobal.obImagini.cale_galerie, "mediu",numeFis+".webp" )
        imag.fisier=path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier )

    }
    console.log(obGlobal.obImagini)
}
initImagini();

//compilare scss->css
function compileazaScss(caleScss, caleCss){
    console.log("cale:",caleCss);
    if(!caleCss){

        let numeFisExt=path.basename(caleScss);
        let numeFis=numeFisExt.split(".")[0]   /// "a.scss"  -> ["a","scss"]
        caleCss=numeFis+".css";
    }

    if (!path.isAbsolute(caleScss))
        caleScss=path.join(obGlobal.folderScss,caleScss )
    if (!path.isAbsolute(caleCss))
        caleCss=path.join(obGlobal.folderCss,caleCss )


    let caleBackup=path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup,{recursive:true})
    }

    // la acest punct avem cai absolute in caleScss si  caleCss
    let numeFisCss=path.basename(caleCss);
    if (fs.existsSync(caleCss)){
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css",numeFisCss ))// +(new Date()).getTime()
    }
    rez=sass.compile(caleScss, {"sourceMap":true});
    fs.writeFileSync(caleCss,rez.css)
    //console.log("Compilare SCSS",rez);
}
//compileazaScss("a.scss");
vFisiere=fs.readdirSync(obGlobal.folderScss);
for( let numeFis of vFisiere ){
    if (path.extname(numeFis)==".scss"){
        compileazaScss(numeFis);
    }
}


fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
    console.log(eveniment, numeFis);
    if (eveniment=="change" || eveniment=="rename"){
        let caleCompleta=path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)){
            compileazaScss(caleCompleta);
        }
    }
})

app.listen(8080);//primeste cereri de pe portul 8080
console.log("Serverul a pornit");