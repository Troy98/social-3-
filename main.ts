import express from 'express'
import cors from "cors"
import { authenticationController, commentController, notificationController, postController, userController } from './modules'
import { globalErrorHandling } from './middleware'
import { PORT } from './config'
import { bootstrapDB } from './DB/connection.db'
import { cloudService, notificationService } from './common/service'
import { promisify } from 'node:util'
import { pipeline } from 'node:stream'
const s3ResponsePipe = promisify(pipeline)
const app:express.Application = express() //msh mandatory a3ml kda 3shan hya constant w ba5od alvalue bta3to mn alintializer

app.use(cors(),express.json())
app.use("/assets", express.static("./assets"));
bootstrapDB(app,PORT)


app.get("/uploads/pre-signed/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const Key = (req.params.path as string[]).join('/')
    const { download = 'false', filename = (req.params.path as string[]).pop() } = req.query as { download?: 'true' | 'false', filename?: string };
    const url = await cloudService.createPreSignedFetchAssetLink({Key,download,filename})
    return res.status(200).json({message:"Done", url })
})
    


app.get("/uploads/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const Key = (req.params.path as string[]).join('/')
    const { download = 'false', filename = (req.params.path as string[]).pop() } = req.query as { download?: 'true' | 'false', filename?: string };
    const {Body} = await cloudService.getAsset({Key})
    res.set("Cross-Origin-Resource-Policy", "cross-origin")
    if (download === 'true') {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    return await s3ResponsePipe(Body as NodeJS.ReadableStream,res) //read mn albody ali btst2blo w alwrite f alres 
})


app.all("/", async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<express.Response> => {
    return res.status(200).json({ message: "Done" })
})




app.use('/auth', authenticationController)
app.use('/user', userController)
app.use('/post', postController)
app.use('/comment', commentController)
app.use('/notification', notificationController)
app.use(globalErrorHandling)
