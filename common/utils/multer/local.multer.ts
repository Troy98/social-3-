import multer from 'multer'
import {fileTypeFromBuffer} from 'file-type'
import {resolve} from 'path'
import {mkdir, readFile, unlink, writeFile} from 'fs/promises'
import { randomUUID } from 'crypto'
import { BadRequestException } from '../../exception'
import { MulterRequest } from '../../interface'
import { StorageApproachEnum } from '../../enum'
import { tmpdir } from 'os'

export const fileValidation = {
    image: ["image/jpeg", "image/png", "image/gif"],
    video: ["video/mp4", "video/mpeg", "video/webm", "video/quicktime"],
    media: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "video/mp4",
        "video/mpeg",
        "video/webm",
        "video/quicktime"
    ],
    files: ["application/pdf", "application/json"]
}


export const localFileUpload = ({maxFileSize = 5,storageApproach=StorageApproachEnum.MEMORY}:{maxFileSize?:number,storageApproach?:StorageApproachEnum}) => {
    const storage = storageApproach == StorageApproachEnum.MEMORY?  multer.memoryStorage() : multer.diskStorage({
        destination(req, file, callback) {
            callback(null,tmpdir())
        },
        filename(req, file, callback) {
            callback(null, randomUUID()+file.originalname)
        },
    })
    return multer({storage, limits: { fileSize: maxFileSize * 1024 * 1024 } })
}


export const processFile = async ({customPath = "general", file, validation}:{customPath?:string, file:Express.Multer.File, validation:string[] }) => {
    if(file.path){
        file.buffer = await readFile(file.path)
    }
    const result = await fileTypeFromBuffer(file.buffer)
    if (!result || !validation.includes(result.mime)) {
        await unlink(file.path)
        throw new BadRequestException("Invalid file formats")
    } else {
        if(file.path){
            await unlink(file.path)
        }
        return file
    }
}



export const processFiles = async ({customPath="general", files, validation}:{customPath?:string, files:Express.Multer.File[], validation:string[] }) => {
    const validatedFiles = []
    for (const file of files) {
        if (file.path && !file.buffer) {
            file.buffer = await readFile(file.path);
        }
        const result = await fileTypeFromBuffer(file.buffer)
        if (!result || !validation.includes(result.mime)) {
            if (file.path) {
                await unlink(file.path);
            }
            throw new BadRequestException("Invalid file formats")
        }
        validatedFiles.push({file, result})
    }

    if (customPath === "posts" || customPath === "User") {
        for (const { file } of validatedFiles) {
            if (file.path) {
                await unlink(file.path);
            }
        }
        return files;
    }

    const assets = []
    for (const { file, result } of validatedFiles) {
        const uniqueFilePath = `${customPath}/${randomUUID()}.${result.ext}`;
        await mkdir(resolve(`./assets/${customPath}`), { recursive: true });
        await writeFile(resolve(`./assets/${uniqueFilePath}`), file.buffer);
        file.path = `assets/${uniqueFilePath}`;
        assets.push(file);
    }
    return assets
}


export const processFields = async ({customPath="general", fields, validation}:{customPath?:string, fields:Record<string,Express.Multer.File[]>, validation:string[] }) => {
    const assets = []
    for (const field of Object.keys(fields)) {
        for (const file of fields[field] as Express.Multer.File[]) {
            const result = await fileTypeFromBuffer(file.buffer)
            if (!result || !validation.includes(result.mime)) {
                throw new BadRequestException("Invalid file formats")
            }
        }
    }

    for (const field of Object.keys(fields)) {
        const files = await processFiles({customPath, files: fields[field] as Express.Multer.File[],validation})
        assets.push({ field, files })
    }
    return assets
}


export const processMulterUpload = async ({req, customPath = "general", validation = [] }:{req:MulterRequest, customPath?:string, validation:string[] }) => {
    if (req.file) {
        await processFile({customPath, file: req.file, validation })
    }
    else if (Array.isArray(req.files)) {
        await processFiles({customPath, files: req.files, validation })
    }
    else if (typeof req.files == "object" && Object.keys(req.files ?? {})?.length){
        await processFields({customPath, fields: req.files, validation })
    }    
}



